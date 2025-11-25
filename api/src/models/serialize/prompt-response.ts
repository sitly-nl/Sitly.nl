import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { Prompt } from '../prompt.model';

export class PromptResponse {
    static keys: (keyof PromptResponse)[] = ['id', 'type', 'created', 'delay'];

    id = this.prompt.instance_id;
    type = this.prompt.prompt_type;
    created = this.prompt.created_at;
    delay = this.prompt.show_delay;

    private constructor(private prompt: Prompt) {}

    static instance(prompt: Prompt) {
        return new PromptResponse(prompt);
    }
}

const serializer = new JSONAPISerializer('prompt', {
    attributes: PromptResponse.keys,
    keyForAttribute: 'camelCase',
});

export const serializePrompt = (prompt: Prompt) => {
    return serializer.serialize(PromptResponse.instance(prompt));
};
