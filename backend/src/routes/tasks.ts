import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { supabase } from '../supabase';
import { transcribeAudio, extractTaskDetails, planifyTask } from '../ai';
import { checkJwt } from '../auth';

const router = express.Router();
const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads';
const upload = multer({ dest: UPLOADS_DIR });

// Helper to get user ID from token
// In express-jwt v8, the decoded token payload is in req.auth
const getUserId = (req: any) => req.auth?.sub;

router.get('/', checkJwt, async (req: any, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'No autorizado' });

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/record', checkJwt, upload.single('audio'), async (req: any, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo de audio' });
    }

    const oldPath = req.file.path;
    const newPath = `${oldPath}.m4a`;
    fs.renameSync(oldPath, newPath);

    // 1. Transcribe audio
    const text = await transcribeAudio(newPath);

    if (!text || text.trim().length === 0) {
      // Clean up file if transcription is empty
      fs.unlinkSync(newPath);
      return res.status(400).json({ error: 'No se detectó voz o el audio está vacío. Por favor, intenta de nuevo.' });
    }

    // Clean up file
    fs.unlinkSync(newPath);

    // 2. Extract Task Details
    const details = await extractTaskDetails(text);

    // 3. Save to Supabase
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: userId,
          title: details.title,
          description: text,
          due_date: details.due_date ? new Date(details.due_date) : null
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.json(data);

  } catch (error: any) {
    console.error('Error processing audio task:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/:id/planify', checkJwt, async (req: any, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = getUserId(req);

    // Fetch the task first
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !task) return res.status(404).json({ error: 'Tarea no encontrada' });

    // AI Generation
    const plan = await planifyTask(task.title, task.description || '');

    // Prepare steps insertion
    const stepsToInsert = plan.steps.map((step: any) => ({
      task_id: taskId,
      title: step.title,
      description: step.description,
      status: 'pending'
    }));

    // Save to DB
    const { data: steps, error: insertError } = await supabase
      .from('task_steps')
      .insert(stepsToInsert)
      .select();

    if (insertError) throw insertError;
    res.json({ steps });

  } catch (error: any) {
    console.error('Error in planify:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.patch('/steps/:id', checkJwt, async (req: any, res: Response) => {
  try {
    const stepId = req.params.id;
    const { status } = req.body; // 'pending' or 'done'
    const userId = getUserId(req);

    // 1. Update the step
    const { data: updatedStep, error: updateError } = await supabase
      .from('task_steps')
      .update({ status })
      .eq('id', stepId)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!updatedStep) return res.status(404).json({ error: 'Paso no encontrado' });

    // 2. Check all steps for this task to update parent task status
    const taskId = updatedStep.task_id;
    const { data: allSteps, error: stepsError } = await supabase
      .from('task_steps')
      .select('status')
      .eq('task_id', taskId);

    if (stepsError) throw stepsError;

    const allDone = allSteps.every((s: any) => s.status === 'done');
    const newTaskStatus = allDone ? 'completed' : 'pending';

    await supabase
      .from('tasks')
      .update({ status: newTaskStatus })
      .eq('id', taskId)
      .eq('user_id', userId);

    res.json(updatedStep);
  } catch (error: any) {
    console.error('Error al actualizar paso:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

router.get('/:id/steps', checkJwt, async (req: any, res: Response) => {
  const taskId = req.params.id;
  const { data, error } = await supabase
    .from('task_steps')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', checkJwt, async (req: any, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = getUserId(req);

    // Verify task ownership and delete
    // If Supabase is set up with CASCADE DELETE for task_steps, it will work automatically.
    // Otherwise, we might need to delete steps first.
    
    // First, let's try to delete the steps explicitly to be safe if cascade isn't on
    await supabase
      .from('task_steps')
      .delete()
      .eq('task_id', taskId);

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Tarea no encontrada o no autorizada' });

    res.json({ message: 'Tarea eliminada correctamente', data });
  } catch (error: any) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

export default router;
