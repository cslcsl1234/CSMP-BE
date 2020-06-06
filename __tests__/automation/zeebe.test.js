const ZB = require('zeebe-node');
const FUNC = require('../../lib/automation/zeebe');
const AutoService = require('../../lib/Automation')
const fs = require('fs');
const configger = require('../../config/configger')


jest.mock('../../lib/Automation_RPA');
var RPA = require('../../lib/Automation_RPA');


describe("TEST", () => {
    const timeout = 600000;

    test("ZeeBe.connect", async () => {

        var zbc = await FUNC.connect();

    }, 20000)

    test("ZeeBe.Service.TEST001", (done) => {
        const TCName = "TestCase01"
        const body = require(`../automation/data/${TCName}.request.json`);
        const CDPInfo = require(`../automation/data/${TCName}.StorageCapability.json`);
        RPA.GetRPAInfo.mockReturnValue(CDPInfo)

        var config = configger.load();
        AutoService.BuildParamaterStrucut(body, async function (AutoObject) {
            const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
            const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)

            var request = {
                bpmnProcessId: 'Parallel-Test',
                //bpmnProcessId: 'Parallel-Test',
                variables: { "paramater1": 1 },
                requestTimeout: timeout,
            }
            const result = await zbc.createWorkflowInstanceWithResult(request).catch((e) => {
                console.log("Exception:" + e)
            })
            console.log(result);
            done();
        }, 100000)

    }, 100000)

})

describe("ZeeBe Service Suite", () => {

    const timeout = 600000;

    test("ZeeBe.connect", async () => {

        var zbc = await FUNC.connect();

    }, 20000)

    /**
     * Provider Storage Device from VPLEX, and include an RPA protect.
     */
    test("ZeeBe.Service.TestCase01", async (done) => {
        const TCName = "TestCase01"
        const body = require(`../automation/data/${TCName}.request.json`);
        const resultFile = `./__tests__/automation/data/${TCName}.result.json`;
        const CDPInfo = require(`../automation/data/${TCName}.StorageCapability.json`);
        RPA.GetRPAInfo.mockReturnValue(CDPInfo)

        try {
            var config = configger.load();
            AutoService.BuildParamaterStrucut(body, async function (AutoObject) {

                const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
                const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)

                for (var i in AutoObject.ResourcePools) {
                    var item = AutoObject.ResourcePools[i]; 
                    if (item.name == body.resourcePoolName) {
                        for (var j in item.members) {
                            var item1 = item.members[j];
                            if (item1.capability !== undefined) item1.capability.CDP.name = TCName
                        }
                    }
                }

                var request = {
                    bpmnProcessId: 'CSMP-Automation-Main',
                    //bpmnProcessId: 'Parallel-Test',
                    variables: AutoObject,
                    requestTimeout: timeout,
                }
                //console.log("-----\n" + JSON.stringify(request,null,2))

                const result = await zbc.createWorkflowInstanceWithResult(request).catch((e) => {
                    console.log("Exception:" + e)
                })
                fs.writeFileSync(resultFile, JSON.stringify(result, 2, 2));
                console.log(`ActionParamaters=[${result.variables.AutoInfo.ActionParamaters.length}]`);


                var ActionParamaters = result.variables.AutoInfo.ActionParamaters;
                expect(result.variables.request.appname).toBe('cbusapp1');

                expect(ActionParamaters.length).toBe(41);

                var i = 0;
                expect(ActionParamaters[i++].StorageVolumeName).toBe("cbusapp1_VMAX193_0529140741back1");
                expect(ActionParamaters[i++].StorageVolumeName).toBe("cbusapp1_unity785_0529140741back1");

                expect(ActionParamaters[i++].Step).toBe("re-discovery physical array in vplex");

                expect(ActionParamaters[i++].Step).toBe("claim physical volume in vplex");

                expect(ActionParamaters[i].Step).toBe("创建Extent");
                expect(ActionParamaters[i++].StorageVolumeName).toBe("cbusapp1_VMAX193_0529140741back1,cbusapp1_unity785_0529140741back1");

                expect(ActionParamaters[i].Step).toBe("创建本地存储卷");
                expect(ActionParamaters[i++].devicename).toBe("device_cbusapp1_VMAX193_0529140741back1");
                expect(ActionParamaters[i].Step).toBe("创建本地存储卷");
                expect(ActionParamaters[i++].devicename).toBe("device_cbusapp1_unity785_0529140741back1");

                expect(ActionParamaters[i].Step).toBe("创建分布式存储卷: dd_cbusapp1_VMAX193_unity785_0529140741back1");
                expect(ActionParamaters[i].devicename).toBe("dd_cbusapp1_VMAX193_unity785_0529140741back1");

                i++;
                expect(ActionParamaters[i].Step).toBe("创建分布式虚拟存储卷");
                expect(ActionParamaters[i].devicename).toBe("dd_cbusapp1_VMAX193_unity785_0529140741back1");

                i++;
                expect(ActionParamaters[i].Step).toBe("分配虚拟化存储卷至存储视图（Storage View）:cbusapp1_VW");
                expect(ActionParamaters[i].clustername).toBe("cluster-1");

                i++;
                expect(ActionParamaters[i].Step).toBe("分配虚拟化存储卷至存储视图（Storage View）:cbusapp1_VW");
                expect(ActionParamaters[i].clustername).toBe("cluster-2");

                i++;
                expect(ActionParamaters[i].Step).toBe("分配虚拟存储卷到一致性组(Consistency Group): cbusapp_CG_Prod");
                expect(ActionParamaters[i].virtual_volume).toBe("dd_cbusapp1_VMAX193_unity785_0529140741back1_vol");

                i++;  // i=11
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA replicate Prod volume");
                expect(ActionParamaters[i].Step).toBe("分配虚拟化存储卷至存储视图（Storage View）: RP");
                expect(ActionParamaters[i].virtualvolumes[0]).toBe("dd_cbusapp1_VMAX193_unity785_0529140741back1_vol");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_VMAX193_0529140741back00_local");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("re-discovery physical array in vplex");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("claim physical volume in vplex");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("创建Extent");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_VMAX193_0529140741back00_local");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("创建本地存储卷");
                expect(ActionParamaters[i].devicename).toBe("device_cbusapp1_VMAX193_0529140741back00_local");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("创建本地虚拟存储卷");
                expect(ActionParamaters[i].devicename).toBe("device_cbusapp1_VMAX193_0529140741back00_local");
                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("分配虚拟化存储卷至存储视图（Storage View）:RP");
                expect(ActionParamaters[i].virtualvolumes[0]).toBe("device_cbusapp1_VMAX193_0529140741back00_local_vol");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA Local Volume using VPLEX");
                expect(ActionParamaters[i].Step).toBe("分配虚拟存储卷到一致性组(Consistency Group): CG_CDP");
                expect(ActionParamaters[i].virtual_volume).toBe("device_cbusapp1_VMAX193_0529140741back00_local_vol");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("Providing RPA replicate remote volume");
                expect(ActionParamaters[i].Step).toBe("RPA-Remote: Create device and assign to sg [RecoverPoint] in pyhsical array [ CKM00163300785 ], arraytype= [ Unity ]");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_unity785_0529140741back01_remote");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_CG_Prod_Log_01_0529140741");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("rediscover physical volume");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("claim the pyhsical volume");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("创建Extent");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_CG_Prod_Log_01_0529140741");
                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("创建本地存储卷(Local Device)");
                expect(ActionParamaters[i].devicename).toBe("device_cbusapp1_CG_Prod_Log_01_0529140741");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("创建本地虚拟存储卷(Virtual Volume)");
                expect(ActionParamaters[i].virtualvolumename).toBe("device_cbusapp1_CG_Prod_Log_01_0529140741_vol");
                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("分配虚拟化存储卷至存储视图（Storage View）:RP");
                expect(ActionParamaters[i].virtualvolumes).toBe("device_cbusapp1_CG_Prod_Log_01_0529140741_vol");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Prod journal volume");
                expect(ActionParamaters[i].Step).toBe("分配虚拟存储卷到一致性组(Consistency Group): CG_CDP");
                expect(ActionParamaters[i].virtual_volume).toBe("device_cbusapp1_CG_Prod_Log_01_0529140741_vol");


                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_CG_Local_Log_01_0529140741");


                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("rediscover physical volume");


                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("claim the pyhsical volume");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("创建Extent");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_CG_Local_Log_01_0529140741");

                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("创建本地存储卷(Local Device)");
                expect(ActionParamaters[i].devicename).toBe("device_cbusapp1_CG_Local_Log_01_0529140741");


                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("创建本地虚拟存储卷(Virtual Volume)");
                expect(ActionParamaters[i].virtualvolumename).toBe("device_cbusapp1_CG_Local_Log_01_0529140741_vol");


                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("分配虚拟化存储卷至存储视图（Storage View）:RP");
                expect(ActionParamaters[i].virtualvolumes).toBe("device_cbusapp1_CG_Local_Log_01_0529140741_vol");


                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Local journal volume");
                expect(ActionParamaters[i].Step).toBe("分配虚拟存储卷到一致性组(Consistency Group): CG_CDP");
                expect(ActionParamaters[i].virtual_volume).toBe("device_cbusapp1_CG_Local_Log_01_0529140741_vol");



                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Consistoncy Group Remote journal volume");
                expect(ActionParamaters[i].Step).toBe("Create device and assign to sg [RecoverPoint] in pyhsical array [ CKM00163300785 ], arraytype= [ Unity ] for RPA Remote Journal volume.");
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_CG_Remote_Log_01_0529140741");



                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Replicate Configuration");
                expect(ActionParamaters[i].Step).toBe("RPA-Local: 在RPA中创建Consistency Group: cbusapp1_CG");
                expect(ActionParamaters[i].ClusterName).toBe("cluster1");



                i++;
                expect(ActionParamaters[i].StepGroupName).toBe("RPA Replicate Configuration");
                expect(ActionParamaters[i].Step).toBe("RPA-Local: 在RPA中创建Replication Set: rs_0529140741back1");
                expect(ActionParamaters[i].ReplicationsetName).toBe("rs_0529140741back1");




                zbc.close().then(() => {
                    console.log('All workers closed')
                    done();
                })


            })
        } catch (error) {
            done(error);
        }


    }, timeout)


    /**
     * Provider Storage Device from VMAX
     */

    test("ZeeBe.Service.TestCase02", async (done) => {
        const TCName = "TestCase02"
        const body = require(`../automation/data/${TCName}.request.json`);
        const resultFile = `./__tests__/automation/data/${TCName}.result.json`;

        try {
            var config = configger.load();
            AutoService.BuildParamaterStrucut(body, async function (AutoObject) {
                for (var i in AutoObject.ResourcePools) {
                    var item = AutoObject.ResourcePools[i]; 
                    if (item.name == body.resourcePoolName) {
                        for (var j in item.members) {
                            var item1 = item.members[j];
                            if (item1.capability !== undefined) item1.capability.CDP.name = TCName
                        }
                    }
                }
                const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
                const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)
                var request = {
                    bpmnProcessId: 'CSMP-Automation-Main',
                    //bpmnProcessId: 'Parallel-Test',
                    variables: AutoObject,
                    requestTimeout: timeout,
                }
                //console.log("-----\n" + JSON.stringify(request,null,2))
                const result = await zbc.createWorkflowInstanceWithResult(request).catch((e) => {
                    console.log("Exception:" + e)
                })
                fs.writeFileSync(resultFile, JSON.stringify(result, 2, 2));
                console.log(`ActionParamaters=[${result.variables.AutoInfo.ActionParamaters.length}]`);

                var ActionParamaters = result.variables.AutoInfo.ActionParamaters;
                expect(ActionParamaters.length).toBe(2);
                expect(result.variables.request.appname).toBe('cbusapp1');


                var i = 0;
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_VMAX192_0529140741back01");

                i++;
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_VMAX192_0529140741back02");




                zbc.close().then(() => {
                    console.log('All workers closed')
                    done();
                })


            })
        } catch (error) {
            done(error);
        }


    }, timeout)



    /**
     * Provider Storage Device from Unity
     */

    test("ZeeBe.Service.TestCase03", async (done) => {
        const TCName = "TestCase03"
        const body = require(`../automation/data/${TCName}.request.json`);
        const resultFile = `./__tests__/automation/data/${TCName}.result.json`;

        try {
            var config = configger.load();
            AutoService.BuildParamaterStrucut(body, async function (AutoObject) {
                for (var i in AutoObject.ResourcePools) {
                    var item = AutoObject.ResourcePools[i]; 
                    if (item.name == body.resourcePoolName) {
                        for (var j in item.members) {
                            var item1 = item.members[j];
                            if (item1.capability !== undefined) item1.capability.CDP.name = TCName
                        }
                    }
                }
                const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
                const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)
                var request = {
                    bpmnProcessId: 'CSMP-Automation-Main',
                    //bpmnProcessId: 'Parallel-Test',
                    variables: AutoObject,
                    requestTimeout: timeout,
                }
                //console.log("-----\n" + JSON.stringify(request,null,2))
                const result = await zbc.createWorkflowInstanceWithResult(request).catch((e) => {
                    console.log("Exception:" + e)
                })
                fs.writeFileSync(resultFile, JSON.stringify(result, 2, 2));
                console.log(`ActionParamaters=[${result.variables.AutoInfo.ActionParamaters.length}]`);

                var ActionParamaters = result.variables.AutoInfo.ActionParamaters;
                expect(ActionParamaters.length).toBe(3);
                expect(result.variables.request.appname).toBe('cbusapp1');


                var i = 0;
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_unity785_0529140741back01");

                i++;
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_unity785_0529140741back02");

                i++;
                expect(ActionParamaters[i].StorageVolumeName).toBe("cbusapp1_unity785_0529140741back03");

                zbc.close().then(() => {
                    console.log('All workers closed')
                    done();
                })


            })
        } catch (error) {
            done(error);
        }


    }, timeout)


    
    /**
     * Provider Storage Device from VPLEX, and include an RPA protect.
     */
    test("ZeeBe.Service.TestCase04", async (done) => {
        const TCName = "TestCase04"
        const body = require(`../automation/data/${TCName}.request.json`);
        const resultFile = `./__tests__/automation/data/${TCName}.result.json`;
        const CDPInfo = require(`../automation/data/${TCName}.StorageCapability.json`);
        RPA.GetRPAInfo.mockReturnValue(CDPInfo)

        try {
            var config = configger.load();
            AutoService.BuildParamaterStrucut(body, async function (AutoObject) {

                const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
                const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)

                for (var i in AutoObject.ResourcePools) {
                    var item = AutoObject.ResourcePools[i]; 
                    if (item.name == body.resourcePoolName) {
                        for (var j in item.members) {
                            var item1 = item.members[j];
                            if (item1.capability !== undefined) item1.capability.CDP.name = TCName
                        }
                    }
                }

                var request = {
                    bpmnProcessId: 'CSMP-Automation-Main',
                    //bpmnProcessId: 'Parallel-Test',
                    variables: AutoObject,
                    requestTimeout: timeout,
                }
                //console.log("-----\n" + JSON.stringify(request,null,2))

                const result = await zbc.createWorkflowInstanceWithResult(request).catch((e) => {
                    console.log("Exception:" + e)
                })
                fs.writeFileSync(resultFile, JSON.stringify(result, 2, 2));
                console.log(`ActionParamaters=[${result.variables.AutoInfo.ActionParamaters.length}]`);


                var ActionParamaters = result.variables.AutoInfo.ActionParamaters;
                expect(result.variables.request.appname).toBe('cbusapp1');

                expect(ActionParamaters.length).toBe(41);
 


                zbc.close().then(() => {
                    console.log('All workers closed')
                    done();
                })


            })
        } catch (error) {
            done(error);
        }


    }, timeout)


    /**
     * Provider Storage Device from VPLEX, and include an RPA protect.
     */
    test("ZeeBe.Service.TestCase05", async (done) => {
        const TCName = "TestCase05"
        const body = require(`../automation/data/${TCName}.request.json`);
        const resultFile = `./__tests__/automation/data/${TCName}.result.json`;
        const CDPInfo = require(`../automation/data/${TCName}.StorageCapability.json`);
        RPA.GetRPAInfo.mockReturnValue(CDPInfo)

        try {
            var config = configger.load();
            AutoService.BuildParamaterStrucut(body, async function (AutoObject) {

                const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
                const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)

                for (var i in AutoObject.ResourcePools) {
                    var item = AutoObject.ResourcePools[i]; 
                    if (item.name == body.resourcePoolName) {
                        for (var j in item.members) {
                            var item1 = item.members[j];
                            if (item1.capability !== undefined) item1.capability.CDP.name = TCName
                        }
                    }
                }

                var request = {
                    bpmnProcessId: 'CSMP-Automation-Main',
                    //bpmnProcessId: 'Parallel-Test',
                    variables: AutoObject,
                    requestTimeout: timeout,
                }
                //console.log("-----\n" + JSON.stringify(request,null,2))

                const result = await zbc.createWorkflowInstanceWithResult(request).catch((e) => {
                    console.log("Exception:" + e)
                })
                fs.writeFileSync(resultFile, JSON.stringify(result, 2, 2));
                console.log(`ActionParamaters=[${result.variables.AutoInfo.ActionParamaters.length}]`);


                var ActionParamaters = result.variables.AutoInfo.ActionParamaters;
                expect(result.variables.request.appname).toBe('cbusapp1');

                expect(ActionParamaters.length).toBe(34);
 


                zbc.close().then(() => {
                    console.log('All workers closed')
                    done();
                })


            })
        } catch (error) {
            done(error);
        }


    }, timeout)

})
