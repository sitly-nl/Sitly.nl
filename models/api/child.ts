import { BaseApiModel } from 'app/models/api/response';
import { Gender } from 'app/models/api/user';

export class Child extends BaseApiModel {
    age: number;
    gender: Gender;
    birthdate?: string;
    traits: ChildTraits[] = [];

    get isExpecting() {
        return this.gender === Gender.unknown;
    }
}

export enum ChildTraits {
    calm = 'calm',
    energetic = 'energetic',
    quiet = 'quiet',
    talkative = 'talkative',
    creative = 'creative',
    sporty = 'sporty',
    curious = 'curious',
    funny = 'funny',
    mischievous = 'mischievous',
    stubborn = 'stubborn',
}

export const allChildTraits = Object.values(ChildTraits);
