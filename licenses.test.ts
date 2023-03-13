import { init } from "license-checker-rseidelsohn";
import { promisify } from "util";
import type { ModuleInfo, ModuleInfos } from "license-checker-rseidelsohn";

const checkLicenses = promisify(init);

let licenses: ModuleInfos = {};
beforeAll(async () => {
	licenses = await checkLicenses({
		start: ".",
		excludePrivatePackages: true,
	});
}, 30000);

const LICENSE_ALLOW_LIST = ["UNLICENSED", "MIT", "BSD-3-Clause", "Apache-2.0"];

expect.extend({
	// using a custom matcher for better output when a test fails
	toBeValidLicense: ({ licenses }: ModuleInfo, name: string) => {
		// license-checker supports multiple licenses per package:
		const licensesArray = Array.isArray(licenses) ? licenses : [licenses];

		// 🚨 this is the important part:
		// pass this test, when every license of the package is in the allow list
		const pass = licensesArray.every(
			(license) => license && LICENSE_ALLOW_LIST.includes(license)
		);

		return {
			pass,
			// display this message with enough info
			message: () =>
				`"${licensesArray.join(",")}" is ${
					pass ? "" : "not "
				}an allowed license (dependency: ${name})`,
		};
	},
});

// This could also go in a .d.ts file, I'll keep it here for simplicity
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeValidLicense(name: string): R;
		}
	}
}

test("all licenses are allowed", async () => {
	Object.entries(licenses).forEach(([name, info]) =>
		expect(info).toBeValidLicense(name)
	);
});

test("snapshot package licenses", async () => {
	expect(
		// dissect the info
		Object.entries(licenses).map(([nameAndVersion, { licenses }]) => {
			// We don't want the version number in the snapshot, this changes too often
			// extract the name from name@1.2.3
			const name = nameAndVersion.split("@").slice(0, -1).join("@");
			// put to a string `name: LICENSES`
			return `${name}: ${licenses}`;
		})
	).toMatchSnapshot();
});
