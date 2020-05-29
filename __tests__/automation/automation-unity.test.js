
const VPLEX = require('../../lib/Automation_VPLEX');
const AutoService = require('../../lib/Automation');
const UNITY = require('../../lib/Automation_UNITY');
const VMAX = require('../../lib/Automation_VMAX');


describe("EMC Unity Automation Service", () => {


    test("Unity.CreateDevice", () => {

        var item785 = {
            "Step": "Create device and assign to sg [ VPLEX_101_BE ] in pyhsical array [ CKM00163300785 ] , arraytype= [ Unity ]",
            "method": "CreatePhysicalDevice_UNITY",
            "arrayinfo": {
                "array_type": "Unity",
                "unity_sn": "CKM00163300785",
                "unity_password": "P@ssw0rd",
                "unity_hostname": "10.32.32.64",
                "unity_pool_name": "jxl_vplex101_pool",
                "unity_username": "admin",
                "sgname": "VPLEX_101_BE"
            },
            "DependOnAction": "N/A",
            "AsignSGName": "VPLEX_101_BE",
            "StorageVolumeName": "ebankwebesxi_unity_785_data_1117120527_test12",
            "capacityByte": 5368709120,
            "show": "false",
            "execute": true
        }

        var item = {
            "Step": "Create device and assign to sg [ VPLEX_101_BE ] in pyhsical array [ CKM00163300785 ] , arraytype= [ Unity ]",
            "method": "CreatePhysicalDevice_UNITY",
            "arrayinfo": {
                "array_type": "Unity",
                "unity_sn": "CKM00140600110",
                "unity_password": "Password1!",
                "unity_hostname": "10.32.32.85",
                "unity_pool_name": "Pool 0",
                "unity_username": "sysadmin",
                "sgname": "RPA_G6_Remote_186"
            },
            "DependOnAction": "N/A",
            "AsignSGName": "RPA_G6_Remote_186",
            "StorageVolumeName": "ebankwebesxi_unity_110_data_1117120527_test12",
            "capacityByte": 5368709120,
            "show": "false",
            "execute": true
        }

        UNITY.CreateDevice(item.arrayinfo, item.AsignSGName, item.capacityByte, item.StorageVolumeName, function (result) {
            if (result.code != 200) {
                //console.log(result.code, `UNITY.CreateDevice is Fail! array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)] msg=[${result.msg}]`, AutoObject);
                var msg = result.data.msg.error.messages;
                console.log(msg)

                res.json(result.code, result);
            } else {
                console.log(result);
                //console.log(result.code, `UNITY.CreateDevice is succeedful. array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)]`, AutoObject);
                res.json(200, result);
            }

        })


    });

})

