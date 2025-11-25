import { Reference } from '../reference.model';

export class ReferenceResponse {
    static keys: (keyof ReferenceResponse)[] = ['id', 'familyName', 'description'];

    id = this.reference.instance_id;
    familyName = this.reference.last_name;
    description = this.reference.description;

    private constructor(private reference: Reference) {}

    static instance(reference: Reference) {
        return new ReferenceResponse(reference);
    }
}
