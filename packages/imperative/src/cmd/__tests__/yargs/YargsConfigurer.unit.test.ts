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

import { CommandProcessor } from "../../src/CommandProcessor";
import { Constants, ImperativeConfig } from "../../..";
import { YargsConfigurer } from "../../src/yargs/YargsConfigurer";

jest.mock("yargs");
jest.mock("../../src/CommandProcessor");

describe("YargsConfigurer tests", () => {

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should write to daemonStream if available', async () => {
        const writeMock = jest.fn();
        const rejectedError = new Error("Test error");
        const invokeSpy = jest.spyOn(CommandProcessor.prototype, "invoke").mockRejectedValue(rejectedError);
        const stream = {write: writeMock};
        const mockedYargs = require("yargs");
        jest.spyOn(ImperativeConfig, "instance", "get").mockReturnValue({
            envVariablePrefix: "MOCK_PREFIX",
            cliHome: "/mock/home",
            daemonContext: {
                stream
            }
        } as any);

        const config = new YargsConfigurer({ name: "any", description: "any", type: "command", children: []},
            mockedYargs, undefined as any, { getHelpGenerator: jest.fn() }, undefined as any, "fake", "fake", "ZOWE", "fake");
        config.configure();
        const handler = mockedYargs.command.mock.calls[0][0].handler;

        await handler({_: []});

        expect(invokeSpy).toHaveBeenCalled();
    });

    it('should not write to daemonStream if not available', async () => {
        const rejectedError = new Error("Test error");
        const invokeSpy = jest.spyOn(CommandProcessor.prototype, "invoke").mockRejectedValue(rejectedError);
        const mockedYargs = require("yargs");
        jest.spyOn(ImperativeConfig, "instance", "get").mockReturnValue({
            envVariablePrefix: "MOCK_PREFIX",
            cliHome: "/mock/home",
            daemonContext: {
                stream: undefined
            }
        } as any);

        const config = new YargsConfigurer({ name: "any", description: "any", type: "command", children: []},
            mockedYargs, undefined as any, { getHelpGenerator: jest.fn() }, undefined as any, "fake", "fake", "ZOWE", "fake");
        config.configure();
        const handler = mockedYargs.command.mock.calls[0][0].handler;

        await handler({_: []});

        expect(invokeSpy).toHaveBeenCalled();
    });


    it("should build a failure message", () => {

        const config = new YargsConfigurer({ name: "any", description: "any", type: "command", children: []},
            undefined, undefined as any, undefined as any, undefined as any, "fake", "fake", "ZOWE", "fake");

        ImperativeConfig.instance.commandLine = "some-command";

        const failmessage = (config as any).buildFailureMessage("apple");
        expect(failmessage).toMatchSnapshot();

    });

    it("should get response format from --response-format-json option", () => {
        const mockedYargs = require("yargs");
        const invokeSpy = jest.spyOn(CommandProcessor.prototype, "invoke").mockResolvedValue(undefined as any);
        jest.spyOn(mockedYargs, "command").mockImplementation((obj: any) => {
            obj.handler({ _: ["abc"], [Constants.JSON_OPTION]: true });
        });

        const config = new YargsConfigurer({ name: "any", description: "any", type: "command", children: []},
            mockedYargs, undefined as any, { getHelpGenerator: jest.fn() }, undefined as any, "fake", "fake", "ZOWE", "fake");
        config.configure();

        expect(invokeSpy).toHaveBeenCalledTimes(1);
        expect(invokeSpy.mock.calls[0][0].responseFormat).toBe("json");
    });

    describe("should handle failure for current command line arguments", () => {
        let buildFailedCmdDefSpy: any;
        let mockedYargs: any;

        /**
         * Helper method to configure yargs twice with different command line arguments
         */
        const configureYargsTwice = () => {
            const config = new YargsConfigurer({ name: "any", description: "any", type: "command", children: []},
                mockedYargs, undefined as any, { getHelpGenerator: jest.fn() }, undefined as any, "fake", "fake", "ZOWE", "fake");
            buildFailedCmdDefSpy = jest.spyOn(config as any, "buildFailedCommandDefinition");

            ImperativeConfig.instance.commandLine = "first-command";
            config.configure();
            ImperativeConfig.instance.commandLine = "second-command";
            config.configure();
        };

        beforeEach(() => {
            mockedYargs = require("yargs");
            jest.spyOn(CommandProcessor.prototype, "invoke").mockResolvedValue(undefined);
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        it("in yargs command handler", () => {
            jest.spyOn(mockedYargs, "command").mockImplementation((obj: any) => {
                obj.handler({ _: ["abc"] });
            });
            configureYargsTwice();

            expect(buildFailedCmdDefSpy).toHaveBeenCalledTimes(2);
            expect(buildFailedCmdDefSpy.mock.results[0].value.name).toBe("fake first-command");
            expect(buildFailedCmdDefSpy.mock.results[1].value.name).toBe("fake second-command");
        });

        it("in yargs fail handler", () => {
            jest.spyOn(mockedYargs, "fail").mockImplementation((callback: any) => {
                callback("error");
            });
            configureYargsTwice();

            expect(buildFailedCmdDefSpy).toHaveBeenCalledTimes(2);
            expect(buildFailedCmdDefSpy.mock.results[0].value.name).toBe("fake first-command");
            expect(buildFailedCmdDefSpy.mock.results[1].value.name).toBe("fake second-command");
        });

        it("in uncaught exception handler", () => {
            jest.spyOn(process, "on").mockImplementation((_: string, callback: any): any => {
                callback(new Error());
            });
            configureYargsTwice();

            expect(buildFailedCmdDefSpy).toHaveBeenCalledTimes(2);
            expect(buildFailedCmdDefSpy.mock.results[0].value.name).toBe("fake first-command");
            expect(buildFailedCmdDefSpy.mock.results[1].value.name).toBe("fake second-command");
        });
    });
});
