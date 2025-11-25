import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { SensitivePhrase } from '../sensitive-phrase.model';

export class SensitivePhraseResponse {
    static keys: (keyof SensitivePhraseResponse)[] = ['id', 'phrase', 'type'];

    id = this.model.instance_id;
    phrase = this.model.phrase;
    type = this.model.type;

    private constructor(private model: SensitivePhrase) {}

    static instance(model: SensitivePhrase) {
        return new SensitivePhraseResponse(model);
    }
}

const sensitivePhraseExclusionSearchSerializer = (meta: Record<string, unknown> | undefined) => {
    return new JSONAPISerializer('sensitive-phrase', {
        attributes: SensitivePhraseResponse.keys,
        keyForAttribute: 'camelCase',
        meta,
    });
};

const sensitivePhraseExclusionSerializer = () => {
    return new JSONAPISerializer('sensitive-phrase', {
        attributes: SensitivePhraseResponse.keys,
        keyForAttribute: 'camelCase',
    });
};

export function serializeSensitivePhraseSearch(data: SensitivePhrase[], meta: Record<string, unknown> | undefined) {
    return sensitivePhraseExclusionSearchSerializer(meta).serialize(data.map(item => SensitivePhraseResponse.instance(item)));
}

export function serializeSensitivePhrase(data: SensitivePhrase) {
    return sensitivePhraseExclusionSerializer().serialize(SensitivePhraseResponse.instance(data));
}
