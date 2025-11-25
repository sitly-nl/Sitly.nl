import { TranslationGroup } from '../translation/translation-group.model';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';

class TranslationGroupResponse {
    static keys: (keyof TranslationGroupResponse)[] = ['id', 'name'];

    id = this.model.translation_group_id;
    name = this.model.group_name;

    private constructor(private model: TranslationGroup) {}

    static instance(model: TranslationGroup) {
        return new TranslationGroupResponse(model);
    }
}

const serializer = new JSONAPISerializer('translation-group', {
    attributes: TranslationGroupResponse.keys,
    keyForAttribute: 'camelCase',
});

export const serialize = (model: TranslationGroup | TranslationGroup[]) => {
    return serializer.serialize(
        Array.isArray(model) ? model.map(item => TranslationGroupResponse.instance(item)) : TranslationGroupResponse.instance(model),
    );
};
