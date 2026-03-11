import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://appcqbvzcfaqnptkxgdz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Get questionnaire
    const { data: questionnaire } = await supabase
      .from('quickask_questionnaires')
      .select('*')
      .eq('token', token)
      .single();

    if (!questionnaire) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get questions and responses
    const { data: questions } = await supabase
      .from('quickask_questions')
      .select('*')
      .eq('questionnaire_id', questionnaire.id)
      .order('sort_order', { ascending: true });

    const { data: responses } = await supabase
      .from('quickask_responses')
      .select('*')
      .eq('questionnaire_id', questionnaire.id);

    // Format results summary
    const results: { question: string; answer: string }[] = [];
    if (questions && responses) {
      for (const q of questions) {
        const response = responses.find((r: any) => r.question_id === q.id);
        const answer = response?.answer_text || response?.selected_suggestions?.join(', ') || 'No answer';
        results.push({ question: q.question_text, answer });
      }
    }

    // Write notification file for OpenClaw to pick up
    const notifDir = '/root/.openclaw/workspace/memory/quickask-notifications';
    const notifFile = join(notifDir, `${token}-${Date.now()}.json`);
    const notification = {
      token,
      client_name: questionnaire.client_name,
      completed_at: new Date().toISOString(),
      results,
    };

    try {
      await mkdir(notifDir, { recursive: true });
      await writeFile(notifFile, JSON.stringify(notification, null, 2));
    } catch (fsErr) {
      // File write may fail on Railway (read-only fs) — that's OK, the DB flag is the primary mechanism
      console.error('Notification file write failed (expected on Railway):', fsErr);
    }

    // Mark as notified in DB
    await supabase
      .from('quickask_questionnaires')
      .update({ notified: true })
      .eq('id', questionnaire.id);

    return NextResponse.json({ ok: true, client_name: questionnaire.client_name });
  } catch (err) {
    console.error('Notify error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
