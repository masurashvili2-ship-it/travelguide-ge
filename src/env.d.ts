/// <reference path="../.astro/types.d.ts" />

type AppUser = {
	id: string;
	email: string;
	role: 'admin' | 'user';
};

declare namespace App {
	interface Locals {
		user?: AppUser;
	}
}
