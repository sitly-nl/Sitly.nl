import { Pipe, PipeTransform } from '@angular/core';
import { YearsExperience } from 'app/models/api/user';

@Pipe({
    name: 'experienceYears',
    standalone: true,
})
export class ExperienceYearsPipe implements PipeTransform {
    transform(value: YearsExperience | string) {
        return value === '5plus' ? '> 5' : value;
    }
}
