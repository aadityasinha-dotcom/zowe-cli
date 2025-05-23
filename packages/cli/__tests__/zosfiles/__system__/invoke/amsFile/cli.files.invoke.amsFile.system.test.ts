/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import * as fs from "fs";
import { TextUtils } from "@zowe/imperative";
import { ITestEnvironment } from "../../../../../../../__tests__/__src__/environment/ITestEnvironment";
import { TestEnvironment } from "../../../../../../../__tests__/__src__/environment/TestEnvironment";
import { ITestPropertiesSchema } from "../../../../../../../__tests__/__src__/properties/ITestPropertiesSchema";
import { getUniqueDatasetName, stripNewLines } from "../../../../../../../__tests__/__src__/TestUtils";
import { ZosFilesMessages } from "@zowe/zos-files-for-zowe-sdk";
import { runCliScript } from "@zowe/cli-test-utils";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment<ITestPropertiesSchema>;
let TEST_ENVIRONMENT_NO_PROF: ITestEnvironment<ITestPropertiesSchema>;
let defaultSystem: ITestPropertiesSchema;
let volume: string;

describe("Invoke AMS CLI", () => {

    function createTestAMSStatementFileFromTemplate(templateFile: string, testEnvironment: ITestEnvironment<ITestPropertiesSchema>, dsname?: string) {
        // replace high-level-qualifier with user value
        const AMSStatement = fs.readFileSync(templateFile).toString();
        const updatedStatement = TextUtils.renderWithMustache(AMSStatement, {DSN: dsname, VOL: volume});
        const filename = templateFile + ".temp";
        fs.writeFileSync(filename, updatedStatement);
        if (!testEnvironment.resources.localFiles.includes(filename)) {
            testEnvironment.resources.localFiles.push(filename);
        }
        return filename;
    }

    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await TestEnvironment.setUp({
            tempProfileTypes: ["zosmf"],
            testName: "zos_invoke_ams"
        });

        defaultSystem = TEST_ENVIRONMENT.systemTestProperties;

        volume = defaultSystem.datasets.vol;

    });

    afterAll(async () => {
        await TestEnvironment.cleanUp(TEST_ENVIRONMENT);
    });

    describe("without profiles", () => {
        let defaultSys: ITestPropertiesSchema;

        // Create the unique test environment
        beforeAll(async () => {
            TEST_ENVIRONMENT_NO_PROF = await TestEnvironment.setUp({
                testName: "zos_files_invoke_ams_file_without_profile"
            });

            defaultSys = TEST_ENVIRONMENT_NO_PROF.systemTestProperties;
            volume = defaultSys.datasets.vol;
        });

        afterAll(async () => {
            await TestEnvironment.cleanUp(TEST_ENVIRONMENT_NO_PROF);
        });

        it("should invoke ams to create and then delete a VSAM cluster using files containing the appropriate control statement", async () => {
            const dsname = getUniqueDatasetName(defaultSys.zosmf.user + ".ZOSTEST");

            // create a temporary file from the template file that has the proper high level qualifier to create the VSAM file
            let controlStatementFile: string = createTestAMSStatementFileFromTemplate(
                process.cwd() + "/packages/zosfiles/__tests__/__system__/methods/invoke/DefineVSAM.ams",
                TEST_ENVIRONMENT_NO_PROF, dsname);

            const ZOWE_OPT_BASE_PATH = "ZOWE_OPT_BASE_PATH";

            // if API Mediation layer is being used (basePath has a value) then
            // set an ENVIRONMENT variable to be used by zowe.
            if (defaultSys.zosmf.basePath != null) {
                TEST_ENVIRONMENT_NO_PROF.env[ZOWE_OPT_BASE_PATH] = defaultSys.zosmf.basePath;
            }

            let response = runCliScript(__dirname + "/__scripts__/command/command_invoke_ams_file_fully_qualified.sh",
                TEST_ENVIRONMENT_NO_PROF,
                [controlStatementFile,
                    defaultSys.zosmf.host,
                    defaultSys.zosmf.port,
                    defaultSys.zosmf.user,
                    defaultSys.zosmf.password]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            let testOutput = stripNewLines(response.stdout.toString());
            expect(testOutput).toContain(ZosFilesMessages.amsCommandExecutedSuccessfully.message);

            // create a temporary file from the template file that has the proper high level qualifier to delete the VSAM file
            controlStatementFile = createTestAMSStatementFileFromTemplate(
                process.cwd() + "/packages/zosfiles/__tests__/__system__/methods/invoke/DeleteVSAM.ams",
                TEST_ENVIRONMENT_NO_PROF, dsname);

            response = runCliScript(__dirname + "/__scripts__/command/command_invoke_ams_file_fully_qualified.sh",
                TEST_ENVIRONMENT_NO_PROF,
                [controlStatementFile,
                    defaultSys.zosmf.host,
                    defaultSys.zosmf.port,
                    defaultSys.zosmf.user,
                    defaultSys.zosmf.password]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            testOutput = stripNewLines(response.stdout.toString());
            expect(testOutput).toContain(ZosFilesMessages.amsCommandExecutedSuccessfully.message);
        });
    });

    describe("Success scenarios", () => {

        it("should invoke ams to create and then delete a VSAM cluster using files containing the appropriate control statement", async () => {
            const dsname = getUniqueDatasetName(defaultSystem.zosmf.user + ".ZOSTEST");

            // create a temporary file from the template file that has the proper high level qualifier to create the VSAM file
            let controlStatementFile: string = createTestAMSStatementFileFromTemplate(
                process.cwd() + "/packages/zosfiles/__tests__/__system__/methods/invoke/DefineVSAM.ams",
                TEST_ENVIRONMENT, dsname);

            let response = runCliScript(__dirname + "/__scripts__/command/command_invoke_ams_file.sh",
                TEST_ENVIRONMENT, [controlStatementFile]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            let testOutput = stripNewLines(response.stdout.toString());
            expect(testOutput).toContain(ZosFilesMessages.amsCommandExecutedSuccessfully.message);

            // create a temporary file from the template file that has the proper high level qualifier to delete the VSAM file
            controlStatementFile = createTestAMSStatementFileFromTemplate(
                process.cwd() + "/packages/zosfiles/__tests__/__system__/methods/invoke/DeleteVSAM.ams",
                TEST_ENVIRONMENT, dsname);

            response = runCliScript(__dirname + "/__scripts__/command/command_invoke_ams_file.sh",
                TEST_ENVIRONMENT, [controlStatementFile]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            testOutput = stripNewLines(response.stdout.toString());
            expect(testOutput).toContain(ZosFilesMessages.amsCommandExecutedSuccessfully.message);
        });
        it("should invoke ams to create and then delete a VSAM cluster using files with response timeout", async () => {
            const dsname = getUniqueDatasetName(defaultSystem.zosmf.user + ".ZOSTEST");

            // create a temporary file from the template file that has the proper high level qualifier to create the VSAM file
            let controlStatementFile: string = createTestAMSStatementFileFromTemplate(
                process.cwd() + "/packages/zosfiles/__tests__/__system__/methods/invoke/DefineVSAM.ams",
                TEST_ENVIRONMENT, dsname);

            let response = runCliScript(__dirname + "/__scripts__/command/command_invoke_ams_file.sh",
                TEST_ENVIRONMENT, [controlStatementFile, "--responseTimeout 5"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            let testOutput = stripNewLines(response.stdout.toString());
            expect(testOutput).toContain(ZosFilesMessages.amsCommandExecutedSuccessfully.message);

            // create a temporary file from the template file that has the proper high level qualifier to delete the VSAM file
            controlStatementFile = createTestAMSStatementFileFromTemplate(
                process.cwd() + "/packages/zosfiles/__tests__/__system__/methods/invoke/DeleteVSAM.ams",
                TEST_ENVIRONMENT, dsname);

            response = runCliScript(__dirname + "/__scripts__/command/command_invoke_ams_file.sh",
                TEST_ENVIRONMENT, [controlStatementFile, "--responseTimeout 5"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            testOutput = stripNewLines(response.stdout.toString());
            expect(testOutput).toContain(ZosFilesMessages.amsCommandExecutedSuccessfully.message);
        });
    });

});
