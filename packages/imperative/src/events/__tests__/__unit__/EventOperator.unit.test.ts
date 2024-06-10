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

import { EventOperator } from '../../src/EventOperator';
import { EventProcessor } from '../../src/EventProcessor';
import { Logger } from '../../..';
import { EventUtils } from '../../src/EventUtils';
import { IProcessorTypes } from '../../src/doc';
import { Event } from '../../..';
import { EventTypes } from "../../src/EventConstants";

jest.mock('../../src/EventProcessor');
jest.mock('../../../Logger');

const logger = Logger.getImperativeLogger();
const getListOfAppsSpy = jest.spyOn(EventUtils, 'getListOfApps');

describe("EventOperator Unit Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("processor tests", () => {
        it("'createProcessor' should create a new 'EventProcessor' if not already existing", () => {
            const appName = 'TestApp';
            const type = IProcessorTypes.BOTH;

            getListOfAppsSpy.mockImplementation(() => ["Zowe", appName]);
            const processor = EventOperator.getProcessor(appName, logger);

            expect(EventProcessor).toHaveBeenCalledWith(appName, type, logger);
            expect(processor).toBeInstanceOf(EventProcessor);
        });

        it("'getZoweProcessor' should return the Zowe processor instance", () => {
            const processor = EventOperator.getZoweProcessor();

            // expect(validateAppNameSpy).toHaveBeenCalledWith("Zowe");
            expect(processor).toBeInstanceOf(EventProcessor);
        });

        it("'getProcessor' should return a generic event processor", () => {
            const appName = 'GenericApp';

            getListOfAppsSpy.mockImplementation(() => ["Zowe", appName]);
            const processor = EventOperator.getProcessor(appName, logger);

            expect(EventProcessor).toHaveBeenCalledWith(appName, IProcessorTypes.BOTH, logger);
            expect(processor).toBeInstanceOf(EventProcessor);
        });

        it("'deleteProcessor' should remove the correct event processor", () => {
            const appName = 'DeleteApp';
            const processor = new EventProcessor(appName, IProcessorTypes.BOTH);

            processor.subscribedEvents = new Map([
                ['testEvent', {
                    eventTime: '',
                    eventName: 'testEvent',
                    eventType: EventTypes.SharedEvents,
                    appName: appName,
                    subscriptions: new Set([
                        {
                            removeAllListeners: jest.fn(),
                            close: jest.fn()
                        }
                    ])
                } as unknown as Event]
            ]);

            EventOperator.deleteProcessor(appName);

            expect(EventOperator['instances'].has(appName)).toBe(false);
        });
    });

    describe("watcher tests", () => {
        it("'getWatcher' should return a watcher-only event processor", () => {
            const appName = 'WatcherApp';
            const processor = EventOperator.getWatcher(appName, logger);

            expect(EventProcessor).toHaveBeenCalledWith(appName, IProcessorTypes.WATCHER, logger);
            expect(processor).toBeInstanceOf(EventProcessor);
        });
        it("'deleteWatcher' should remove the correct event processor", () => {
            const appName = 'DeleteWatcher';
            const processor = new EventProcessor(appName, IProcessorTypes.WATCHER);

            processor.subscribedEvents = new Map([
                ['testEvent', {
                    eventTime: '',
                    eventName: 'testEvent',
                    eventType: EventTypes.UserEvents,
                    appName: appName,
                    subscriptions: new Set([
                        {
                            removeAllListeners: jest.fn(),
                            close: jest.fn()
                        }
                    ])
                } as unknown as Event]
            ]);

            EventOperator.deleteWatcher(appName);

            expect(EventOperator['instances'].has(appName)).toBe(false);
        });
    });

    describe("emitter tests", () => {
        it("'getEmitter' should return an emitter-only event processor", () => {
            const appName = 'EmitterApp';
            const processor = EventOperator.getEmitter(appName, logger);

            expect(EventProcessor).toHaveBeenCalledWith(appName, IProcessorTypes.EMITTER, logger);
            expect(processor).toBeInstanceOf(EventProcessor);
        });

        it("'deleteEmitter' should remove the correct event processor", () => {
            const appName = 'DeleteEmitter';
            const processor = new EventProcessor(appName, IProcessorTypes.EMITTER);

            processor.subscribedEvents = new Map([
                ['testEvent', {
                    eventTime: '',
                    eventName: 'testEvent',
                    eventType: EventTypes.UserEvents,
                    appName: appName,
                    subscriptions: new Set([
                        {
                            removeAllListeners: jest.fn(),
                            close: jest.fn()
                        }
                    ])
                } as unknown as Event]
            ]);

            EventOperator.deleteEmitter(appName);

            expect(EventOperator['instances'].has(appName)).toBe(false);
        });
    });
});