import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'interv-interview-suggested-questions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-suggested-questions.html',
  styleUrl: './interview-suggested-questions.scss',
})
export class InterviewSuggestedQuestionsComponent {
  readonly questions = input.required<string[]>();
  readonly isLoading = input(false);
  readonly canSendMessage = input(false);
  readonly isComplete = input(false);
  readonly messageCount = input(0);
  readonly maxMessages = input(8);
  readonly usedKeys = input<readonly string[]>([]);

  readonly questionSelected = output<string>();

  readonly visible = computed(
    () =>
      (this.isLoading() || this.questions().length > 0) &&
      !this.isComplete() &&
      this.messageCount() < this.maxMessages(),
  );

  isUsed(question: string): boolean {
    return this.usedKeys().includes(this.normalizeQuestion(question));
  }

  onSelect(question: string): void {
    if (this.isUsed(question) || !this.canSendMessage()) {
      return;
    }
    this.questionSelected.emit(question);
  }

  private normalizeQuestion(question: string): string {
    return question.trim().toLowerCase();
  }
}
