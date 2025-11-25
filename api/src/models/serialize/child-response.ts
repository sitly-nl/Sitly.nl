import { genderMap } from '../../types';
import { Child } from '../child.model';

export class ChildResponse {
    static publicKeys: (keyof ChildResponse)[] = ['age', 'gender', 'traits'];
    static privateKeys: (keyof ChildResponse)[] = [...ChildResponse.publicKeys, 'birthdate'];

    id = this.child.instance_id;
    gender = genderMap[this.child.gender];
    birthdate = this.child.birthdate.toISOString();
    traits = this.child.traits;
    age = this.child.age;

    private constructor(private child: Child) {}

    static instance(child: Child) {
        return new ChildResponse(child);
    }
}
