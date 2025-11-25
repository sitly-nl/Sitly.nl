import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Child, allChildTraits } from 'app/models/api/child';
import { Gender } from 'app/models/api/user';
import { UcFirst } from 'modules/shared/pipes/ucfirst.pipe';
import { map } from 'rxjs/operators';

@Pipe({
    name: 'traits',
    pure: false,
})
export class ChildTraitsPipe implements PipeTransform {
    private translateService = inject(TranslateService);
    private ucFirst = inject(UcFirst);

    transform(child: Child) {
        return this.translateService.get(allChildTraits.map(item => 'childTraits.' + item)).pipe(
            map(translations => {
                return this.ucFirst.transform(child.traits.map(trait => translations[`childTraits.${trait}`]).join(', '));
            }),
        );
    }
}

@Pipe({
    name: 'icon',
})
export class ChildIconPipe implements PipeTransform {
    transform(child: Child) {
        if (child.gender === Gender.unknown || child.age < 1) {
            return 'human/child';
        } else if (child.age <= 3) {
            return 'human/toddler';
        } else if (child.age <= 6) {
            return 'human/kindergartner';
        } else if (child.age <= 11) {
            return child.gender === Gender.female ? 'human/schoolgirl' : 'human/schoolboy';
        } else {
            return child.gender === Gender.female ? 'human/teenager-girl' : 'human/teenager';
        }
    }
}

@Pipe({
    name: 'title',
})
export class ChildTitlePipe implements PipeTransform {
    transform(child: Child) {
        switch (child.gender) {
            case Gender.unknown:
                return 'child.expecting';
            case Gender.male:
                return child.age === 1 ? 'child.male.oneYear' : 'child.male.years';
            case Gender.female:
                return child.age === 1 ? 'child.female.oneYear' : 'child.female.years';
        }
    }
}
