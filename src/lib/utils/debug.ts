import { supabase } from '../supabase';

interface DebugLog {
  function_name: string;
  input_params?: any;
  output_data?: any;
  error_message?: string;
}

export async function logDebug(log: DebugLog) {
  if (import.meta.env.MODE === 'development') {
    console.group(`Debug: ${log.function_name}`);
    if (log.input_params) console.log('Input:', log.input_params);
    if (log.output_data) console.log('Output:', log.output_data);
    if (log.error_message) console.error('Error:', log.error_message);
    console.groupEnd();
  }

  try {
    const { error } = await supabase
      .from('debug_logs')
      .insert([log]);

    if (error) {
      console.error('Failed to save debug log:', error);
    }
  } catch (err) {
    console.error('Error saving debug log:', err);
  }
}

export function formatDebugError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack}`;
  }
  return String(error);
}