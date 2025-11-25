import { BaseApiModel, Relationship, ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';

export abstract class BaseParser {
    abstract parse(data: ServerResponseData, included: ServerResponseData[], parsersMap: ParserMap): BaseApiModel;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    parseBase<T extends BaseApiModel>(TCreator: new () => T, data: ServerResponseData) {
        let result = new TCreator();
        result = Object.assign(result, data.attributes);
        result.links = data.links ?? {};
        result.meta = data.meta ?? {};
        result.id = data.id;
        return result;
    }

    protected getRelationship<T extends BaseApiModel | BaseApiModel[]>(
        name: string,
        data: ServerResponseData,
        included: ServerResponseData[],
        parsersMap: ParserMap,
    ) {
        const relationship = data?.relationships?.[name]?.data;
        if (!relationship) {
            return undefined;
        }

        if (relationship instanceof Array) {
            return relationship.map(item => this.parseDataObject(item, included, parsersMap)) as T;
        } else {
            return this.parseDataObject(relationship, included, parsersMap) as T;
        }
    }

    private parseDataObject(relationship: Relationship, included: ServerResponseData[], parsersMap: ParserMap) {
        const relationshipObject = included.find(item => {
            return item?.type === relationship.type && item?.id === relationship.id;
        });
        return relationshipObject ? parsersMap[relationship.type]?.parse(relationshipObject, included, parsersMap) : null;
    }
}
