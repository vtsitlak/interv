import { of } from 'rxjs';

export class Auth {}

export const authState = jest.fn(() => of(null));

export const browserPopupRedirectResolver = {};

export const createUserWithEmailAndPassword = jest.fn();

export const getRedirectResult = jest.fn();

export const signInWithEmailAndPassword = jest.fn();

export const signInWithPopup = jest.fn();

export const signOut = jest.fn();

export const GoogleAuthProvider = class GoogleAuthProvider {};
