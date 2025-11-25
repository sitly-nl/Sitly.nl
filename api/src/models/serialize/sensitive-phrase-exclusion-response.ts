import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { SensitivePhraseExclusion } from '../sensitive-phrase-exclusion.model';

export class SensitivePhraseExclusionResponse {
    static keys: (keyof SensitivePhraseExclusionResponse)[] = ['id', 'phrase'];

    id = this.model.instance_id;
    phrase = this.model.phrase;

    private constructor(private model: SensitivePhraseExclusion) {}

    static instance(model: SensitivePhraseExclusion) {
        return new SensitivePhraseExclusionResponse(model);
    }
}

const sensitivePhraseExclusionSearchSerializer = (meta: Record<string, unknown> | undefined) => {
    return new JSONAPISerializer('sensitive-phrase-exclusion', {
        attributes: SensitivePhraseExclusionResponse.keys,
        keyForAttribute: 'camelCase',
        meta,
    });
};

const sensitivePhraseExclusionSerializer = () => {
    return new JSONAPISerializer('sensitive-phrase-exclusion', {
        attributes: SensitivePhraseExclusionResponse.keys,
        keyForAttribute: 'camelCase',
    });
};

export function serializeSensitivePhraseExclusionSearch(data: SensitivePhraseExclusion[], meta: Record<string, unknown> | undefined) {
    return sensitivePhraseExclusionSearchSerializer(meta).serialize(data.map(item => SensitivePhraseExclusionResponse.instance(item)));
}

export function serializeSensitivePhraseExclusion(data: SensitivePhraseExclusion) {
    return sensitivePhraseExclusionSerializer().serialize(SensitivePhraseExclusionResponse.instance(data));
}
