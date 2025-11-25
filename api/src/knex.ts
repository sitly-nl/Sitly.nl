import { knex } from 'knex';

export const getKnex = () => {
    return knex({ client: 'mysql' });
};
