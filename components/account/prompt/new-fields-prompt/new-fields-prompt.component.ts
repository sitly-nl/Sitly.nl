import { Component, OnInit } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { NewFieldsPromptCompletedComponent } from 'app/components/prompt/new-fields-prompt/completed/new-fields-prompt-completed.component';
import { NewFieldsPromptTraitsComponent } from 'app/components/prompt/new-fields-prompt/foster/traits/new-fields-prompt-traits.component';
import { NewFieldsPromptSkillsComponent } from 'app/components/prompt/new-fields-prompt/foster/skills/new-fields-prompt-skills.component';
import { NewFieldsPromptAdditionalInfoComponent } from 'app/components/prompt/new-fields-prompt/foster/additional-info/new-fields-prompt-additional-info.component';
import { NewFieldsPromptChoresComponent } from 'app/components/prompt/new-fields-prompt/parent/chores/new-fields-prompt-chores.component';
import { NewFieldsPromptHourlyRatesComponent } from 'app/components/prompt/new-fields-prompt/parent/hourly-rates/new-fields-prompt-hourly-rates.component';
import { NewFieldsPromptGenderComponent } from 'app/components/prompt/new-fields-prompt/parent/gender/new-fields-prompt-gender.component';

enum NewFieldsPromptScreen {
    gender,
    hourlyRates,
    chores,
    additionalInfo,
    skills,
    fosterTraits,
    completed,
}

@Component({
    selector: 'new-fields-prompt',
    templateUrl: './new-fields-prompt.component.html',
    styleUrls: ['./new-fields-prompt.component.base.less'],
    standalone: true,
    imports: [
        NewFieldsPromptGenderComponent,
        NewFieldsPromptHourlyRatesComponent,
        NewFieldsPromptChoresComponent,
        NewFieldsPromptAdditionalInfoComponent,
        NewFieldsPromptSkillsComponent,
        NewFieldsPromptTraitsComponent,
        NewFieldsPromptCompletedComponent,
    ],
})
export class NewFieldsPromptComponent extends BaseComponent implements OnInit {
    progress: number;
    step = 0;
    get completed() {
        return this.progress === 1;
    }
    get screens() {
        if (this.authUser.isParent) {
            return [
                NewFieldsPromptScreen.gender,
                NewFieldsPromptScreen.hourlyRates,
                NewFieldsPromptScreen.chores,
                NewFieldsPromptScreen.completed,
            ];
        } else {
            return [
                NewFieldsPromptScreen.additionalInfo,
                NewFieldsPromptScreen.skills,
                NewFieldsPromptScreen.fosterTraits,
                NewFieldsPromptScreen.completed,
            ];
        }
    }
    NewFieldsPromptScreen = NewFieldsPromptScreen;

    dialogVisible = false;

    private onCancel: () => void;

    ngOnInit() {
        this.updateProgress();
    }

    show() {
        this.dialogVisible = true;
    }

    setOnCancel(onCancel: () => void) {
        this.onCancel = onCancel;
    }

    hide() {
        this.dialogVisible = false;
        this.onCancel?.();
    }

    private updateProgress() {
        const startProgress = this.authUser.isParent ? 0.8 : 0.85;
        this.setProgress(startProgress + ((1 - startProgress) * this.step) / (this.screens.length - 1));
    }

    private setProgress(progress: number) {
        this.progress = progress;

        const dimension = this.isDesktop() ? 74 : 62;
        const scale = window.devicePixelRatio;
        const lineHeight = 4;

        const canvas = document.getElementById('progress-canvas') as HTMLCanvasElement;
        canvas.width = scale * dimension;
        canvas.height = scale * dimension;
        canvas.style.width = `${dimension}px`;
        canvas.style.height = `${dimension}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(scale, scale);
            ctx.lineWidth = lineHeight;

            const progressEnd = (2 * progress - 0.5) * Math.PI;
            ctx.strokeStyle = this.completed ? '#44d7b6' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(0.5 * dimension, 0.5 * dimension, 0.5 * (dimension - lineHeight), -0.5 * Math.PI, progressEnd);
            ctx.stroke();

            if (!this.completed) {
                ctx.strokeStyle = '#bccdda';
                ctx.beginPath();
                const gap = progress === 0 ? 0 : 0.05 * Math.PI;
                ctx.arc(0.5 * dimension, 0.5 * dimension, 0.5 * (dimension - lineHeight), progressEnd + gap, 1.5 * Math.PI - gap);
                ctx.stroke();
            }
        }
    }

    moveBack() {
        this.step--;
        this.updateProgress();
    }

    moveFurther() {
        this.step++;
        this.updateProgress();
    }
}
