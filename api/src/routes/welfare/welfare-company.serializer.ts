import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { ModelAttributes } from '../../models/model-attributes';
import { WelfareCompany } from '../../models/welfare/welfare-company.model';

export class WelfareCompanyAttributes extends ModelAttributes {
    protected mappings = {
        id: 'company_id',
        name: 'name',
        address: 'address',
        contactPerson: 'contact_person',
        contactEmail: 'contact_email',
    };
}

export class WelfareCompanySerializer {
    private static attributes = new WelfareCompanyAttributes();
    private static serializer = new JSONAPISerializer('welfare-company', {
        attributes: WelfareCompanySerializer.attributes.getAttributeKeys(),
        keyForAttribute: 'camelCase',
        transform: (item: WelfareCompany) => WelfareCompanySerializer.attributes.map(item.toJSON() as unknown as Record<string, unknown>),
    });

    static serialize(company: unknown) {
        return WelfareCompanySerializer.serializer.serialize(company);
    }
}
