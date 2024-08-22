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

import { ITestEnvironment, TestEnvironment, runCliScript } from "@zowe/cli-test-utils";
import { ITestPropertiesSchema } from "../../../../../../__tests__/__src__/properties/ITestPropertiesSchema";
import { AbstractSession } from "@zowe/imperative";
import * as fs from "fs";
import { GetJobs, IJob } from "@zowe/zos-jobs-for-zowe-sdk";

// Test Environment populated in the beforeAll();
let REAL_SESSION: AbstractSession;
let TEST_ENVIRONMENT: ITestEnvironment<ITestPropertiesSchema>;
let IEFBR14_JCL: string;

describe("zos-jobs download output command", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await TestEnvironment.setUp({
            testName: "zos_jobs_download_output_command",
            tempProfileTypes: ["zosmf"]
        }, REAL_SESSION = await TestEnvironment.createSession());

        IEFBR14_JCL = TEST_ENVIRONMENT.systemTestProperties.zosjobs.iefbr14Member;
    });

    afterAll(async () => {
        await TestEnvironment.cleanUp(TEST_ENVIRONMENT);
    });

    describe("error handling", () => {
        it("should surface an error from z/OSMF if the jobid doesn't exist", () => {
            const response = runCliScript(__dirname + "/__scripts__/download-output/not_found.sh", TEST_ENVIRONMENT);
            expect(response.status).toBe(1);
            expect(response.stdout.toString()).toBe("");
            expect(response.stderr.toString()).toContain("Cannot obtain job info for job id = JOB00000");
            expect(response.stderr.toString()).toContain("Zero jobs were returned");
        });
    });

    describe("output", () => {
        it("should download all spool files of a job", async () => {
            const outdir: string = TEST_ENVIRONMENT.workingDir + "/output/JES2";
            const response = runCliScript(__dirname + "/__scripts__/download-output/download.sh",
                TEST_ENVIRONMENT, [IEFBR14_JCL]);

            // Extract the JOBID from the response output
            const jobidRegex = /Submitted job ID: (JOB\d+)/;
            const match = response.stdout.toString().match(jobidRegex);
            const jobid = match ? match[1] : null;

            // Ensure the job ID was captured correctly
            expect(jobid).not.toBeNull();

            const job: IJob = await GetJobs.getJob(REAL_SESSION, jobid);

            expect(response.status).toBe(0);
            expect(response.stderr.toString()).toBe("");
            expect(fs.existsSync(`${outdir}/JESMSGLG.txt`)).toBeTruthy();
            expect(fs.existsSync(`${outdir}/JESJCL.txt`)).toBeTruthy();
            expect(fs.existsSync(`${outdir}/JESYSMSG.txt`)).toBeTruthy();
            expect(response.stdout.toString()).toContain("Successfully downloaded");

            TEST_ENVIRONMENT.resources.jobs.push(job);
        });

        describe("without profiles", () => {

            // Create a separate test environment for no profiles
            let TEST_ENVIRONMENT_NO_PROF: ITestEnvironment<ITestPropertiesSchema>;
            let DEFAULT_SYSTEM_PROPS: ITestPropertiesSchema;

            beforeAll(async () => {
                TEST_ENVIRONMENT_NO_PROF = await TestEnvironment.setUp({
                    testName: "zos_jobs_download_output_without_profiles"
                }, REAL_SESSION = await TestEnvironment.createSession());

                DEFAULT_SYSTEM_PROPS = TEST_ENVIRONMENT_NO_PROF.systemTestProperties;
            });

            afterAll(async () => {
                await TestEnvironment.cleanUp(TEST_ENVIRONMENT_NO_PROF);
            });

            it("should download all spool files of a job", async () => {
                const outdir: string = TEST_ENVIRONMENT.workingDir + "/output/JES2";
                const ZOWE_OPT_BASE_PATH = "ZOWE_OPT_BASE_PATH";

                // if API Mediation layer is being used (basePath has a value) then
                // set an ENVIRONMENT variable to be used by zowe.
                if (DEFAULT_SYSTEM_PROPS.zosmf.basePath != null) {
                    TEST_ENVIRONMENT_NO_PROF.env[ZOWE_OPT_BASE_PATH] = DEFAULT_SYSTEM_PROPS.zosmf.basePath;
                }

                const response = runCliScript(__dirname + "/__scripts__/download-output/download_fully_qualified.sh",
                    TEST_ENVIRONMENT_NO_PROF,
                    [
                        IEFBR14_JCL,
                        DEFAULT_SYSTEM_PROPS.zosmf.host,
                        DEFAULT_SYSTEM_PROPS.zosmf.port,
                        DEFAULT_SYSTEM_PROPS.zosmf.user,
                        DEFAULT_SYSTEM_PROPS.zosmf.password,
                    ]);

                // Extract the JOBID from the response output
                const jobidRegex = /Submitted job ID: (JOB\d+)/;
                const match = response.stdout.toString().match(jobidRegex);
                const jobid = match ? match[1] : null;

                // Ensure the job ID was captured correctly
                expect(jobid).not.toBeNull();

                const job: IJob = await GetJobs.getJob(REAL_SESSION, jobid);

                expect(response.stderr.toString()).toBe("");
                expect(response.status).toBe(0);
                expect(fs.existsSync(`${outdir}/JESMSGLG.txt`)).toBeTruthy();
                expect(fs.existsSync(`${outdir}/JESJCL.txt`)).toBeTruthy();
                expect(fs.existsSync(`${outdir}/JESYSMSG.txt`)).toBeTruthy();
                expect(response.stdout.toString()).toContain("Successfully downloaded");

                TEST_ENVIRONMENT.resources.jobs.push(job);
            });
        });
    });
});
