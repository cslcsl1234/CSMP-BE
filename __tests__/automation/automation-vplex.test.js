
const VPLEX = require('../../lib/Automation_VPLEX');
const AUTO = require('../../lib/Automation');

describe("EMC VPLEX Automation Service", () => {

    var arrayinfo = {
        "arrayname": "EMCCTEST1",
        "arraytype": "VPLEX",
        "info": {
            "name": "EMCCTEST",
            "array_type": "VPLEX",
            "version": "5.5",
            "endpoint": "https://10.32.32.100/vplex",
            "auth": {
                "username": "service",
                "password": "password"
            }
        },
        "backend_array": [
            {
                "array_type": "VMAX",
                "serial_no": "000297800193",
                "password": "smc",
                "unispherehost": "10.121.0.204",
                "universion": "90",
                "user": "smc",
                "verifycert": false,
                "sgname": "MSCS_SG"
            },
            {
                "array_type": "Unity",
                "unity_sn": "CKM00163300785",
                "unity_password": "P@ssw0rd",
                "unity_hostname": "10.32.32.64",
                "unity_pool_name": "jxl_vplex101_pool",
                "unity_username": "admin",
                "sgname": "VPLEX_101_BE"
            }
        ]
    };

    var request =
    {
        "appname": "APPNAME",
        "usedfor": "data",
        "capacity": 7,
        "count": 1,
        "StorageResourcePool": {
            "name": "VPLEX-高端",
            "resourceLevel": "Gold",
            "resourceType": "VPLEX",
            "TotalCapacity": 100,
            "UsedCapacity": 30,
            "members": [arrayinfo],
            "index": "0"
        },
        "ProtectLevel": {
            "DR_SameCity": "disable",
            "Backup": false,
            "AppVerification_SameCity": false,
            "AppVerification_DiffCity": false,
            "hostDeplpy": "SC"
        }
    }

    test("VPLEX.CreateVirtualVolumeService", (done) => {

        var backend_array_1 = {
            "array_type": "VMAX",
            "serial_no": "000297800193",
            "password": "smc",
            "unispherehost": "10.121.0.204",
            "universion": "90",
            "user": "smc",
            "verifycert": false,
            "sgname": "MSCS_SG"
        };

        var backend_array_2 = {
            "array_type": "Unity",
            "unity_sn": "67890",
            "unity_password": "P@ssw0rd",
            "unity_hostname": "10.32.32.64",
            "unity_pool_name": "jxl_vplex101_pool",
            "unity_username": "admin",
            "sgname": "VPLEX_101_BE"
        };
        var stepgroupname = 'CreateVirtualVolumeService TEST'
        var volName = "APPNAME_vplex_backend_data_01";
        var capacityGB = 20;
        var clustername = 'cluster-1';
        var sgname = "SGNAME";
        var cgname = "CGName";

        var result = VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername, sgname, cgname);
        expect(result.length).toBeGreaterThan(0);

        var clustername1 = 'cluster111';
        var result = VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername1, sgname, cgname);
        expect(result.length).toBe(0);

        var cgname1;
        var result = VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername, sgname, cgname1);
        var isexist = false;
        result.forEach(item => {
            if (item.method == 'AssignConsistencyGroup') isexist = true;
        })
        expect(isexist).toBe(false);

        var sgname1;
        var result = VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername, sgname1, cgname);
        var isexist = false;
        result.forEach(item => {
            if (item.method == 'AssignStorageView') isexist = true;
        })
        expect(isexist).toBe(false);
        done();

    }, 1200000)



    test("VPLEX.GetStorageViewsDemoVersion", (done) => {
        var arrayInfo = arrayinfo.info;
        var cluster = 'cluster-1';
        VPLEX.GetStorageViewsDemoVersion(arrayInfo, cluster, function (retData) {
            console.log(JSON.stringify(retData, 2, 2));
            done();
        })
    })

})