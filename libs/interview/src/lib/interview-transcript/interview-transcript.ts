import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ChatMessage } from '@interv/state-interview';

@Component({
  selector: 'lib-interview-transcript',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-transcript.html',
})
export class InterviewTranscriptComponent {
  readonly messages = input<ChatMessage[]>([]);
  readonly isLoading = input(false);

  roleLabel(role: ChatMessage['role']): string {
    return role === 'user' ? 'Recruiter question' : 'AI twin response';
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
