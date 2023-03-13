import { init } from "license-checker-rseidelsohn";
import { promisify } from "util";

const checkLicenses = promisify(init);

type Info = { name: string; licenses: string[] };

let packages: Array<Info>;

beforeAll(async () => {
	const rawResult = await checkLicenses({
		// start at the root of our project
		start: ".",

		// we don't need to check our own license
		excludePackages: "blog-license-check-demo",

		// There's a bug in license-checker-rseidelsohn
		// => https://github.com/RSeidelsohn/license-checker-rseidelsohn/issues/35
		//  🚨 this enables only checking direct dependencies!
		direct: 0 as any,
	});

	packages = Object.entries(rawResult).map(([rawName, result]) => {
		// e.g. @foo/bar@1.2.3 => ["", "foo/bar", "1.2.3"]
		const parts = rawName.split("@");
		const name = parts.slice(0, -1).join("@"); // @foo/bar

		// license-checker supports multiple licenses per package:
		const licenses = result.licenses ?? ["UNLICENSED"];

		return {
			name,
			// license-checker supports multiple licenses per package:
			licenses: Array.isArray(licenses) ? licenses : [licenses],
		};
	});
	// License compilation might take a bit, so we don't want to run into Jest's 5s timeout
}, 30000);

const LICENSE_ALLOW_LIST = ["UNLICENSED", "MIT", "BSD-3-Clause", "Apache-2.0"];

expect.extend({
	// using a custom matcher for better output when a test fails
	toBeValidLicense: ({ licenses, name }: Info) => {
		// 🚨 this is the important part:
		// pass this test, when every license of the package is in the allow list
		const pass = licenses.every(
			(license) => license && LICENSE_ALLOW_LIST.includes(license)
		);

		return {
			pass,
			// display this message with enough info
			message: () =>
				`"${licenses.join(",")}" is ${
					pass ? "" : "not "
				}an allowed license (dependency: ${name})`,
		};
	},
});

// This could also go in a .d.ts file, I'll keep it here for simplicity
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeValidLicense(): R;
		}
	}
}

test("all licenses are allowed", async () => {
	packages.forEach((info) => expect(info).toBeValidLicense());
});

test("snapshot package licenses", async () => {
	expect(
		packages.map(({ licenses, name }) => `${name}: ${licenses}`)
	).toMatchSnapshot();
});
