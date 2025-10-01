import { ToolboxTalk, QueuedSubmission } from '../types';
import { storage } from './storage';
import { logger } from './logger';

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK;

export const api = {
  submitTalk: async (talk: ToolboxTalk): Promise<boolean> => {
    if (!WEBHOOK_URL) {
      console.warn('No webhook URL configured');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Get logs for this talk to include in payload
      const talkLogs = logger.getLogsForTalk(talk.id);

      // Transform the talk data to match the desired webhook payload structure
      const selectedRecipients = talk.recipients
        .filter(r => r.selected)
        .map(r => r.email);

      // Parse structured content if available
      let sections = null;
      try {
        if (talk.content && typeof talk.content === 'string') {
          const parsed = JSON.parse(talk.content);
          if (parsed && typeof parsed === 'object' && 'i' in parsed) {
            sections = {
              intro: parsed.i,
              hazards: parsed.hazards || [],
              practices: parsed.practices || [],
              ppe: parsed.ppe || [],
              sif: parsed.sif || [],
              manual: parsed.manual || [],
              q: parsed.q || []
            };
          }
        }
      } catch (error) {
        // If parsing fails, sections will remain null and we'll send the raw content
      }

      // Generate PDF filename
      const sanitizedTitle = talk.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const pdfFilename = `${sanitizedTitle}_${talk.date}.pdf`;

      // Create the transformed payload
      const webhookPayload = {
        talk_id: talk.id,
        date: talk.date,
        title: talk.title,
        project: {
          name: talk.location,
          number: talk.projectNumber || ''
        },
        finalized_by: {
          name: talk.supervisor,
          email: talk.supervisorEmail || ''
        },
        recipients: selectedRecipients,
        sections: sections || {
          intro: talk.content,
          hazards: [],
          practices: [],
          ppe: [],
          sif: [],
          manual: [],
          q: []
        },
        pdf_filename: pdfFilename,
        weather: talk.weather,
        attendees: talk.attendees.map(a => ({
          name: a.name,
          present: a.present,
          isTemporary: a.isTemporary || false
        })),
        // Include original data for backward compatibility
        _original_talk: talk,
        _logs: talkLogs,
        timestamp: Date.now(),
        type: 'toolbox_talk'
      };
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Clear logs for this talk after successful submission
        logger.clearLogsForTalk(talk.id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Submission failed:', error);
      
      // Add to offline queue
      const queuedSubmission: QueuedSubmission = {
        id: `queue_${Date.now()}`,
        talk,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      storage.addToQueue(queuedSubmission);
      return false;
    }
  },

  processQueue: async (): Promise<void> => {
    const queue = storage.getQueue();
    
    for (const submission of queue) {
      try {
        const success = await api.submitTalk(submission.talk);
        
        if (success) {
          storage.removeFromQueue(submission.id);
        } else {
          // Increment retry count
          submission.retryCount++;
          if (submission.retryCount >= 3) {
            storage.removeFromQueue(submission.id);
          }
        }
      } catch (error) {
        console.error('Queue processing error:', error);
      }
    }
  },

  isOnline: (): boolean => {
    return navigator.onLine;
  }
};