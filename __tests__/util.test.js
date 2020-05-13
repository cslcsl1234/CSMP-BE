const util = require("../lib/util");
const config = require("../config/configger")
const moment = require('moment')

jest.mock("../config/configger")

describe("UTIL time function", () => {
    test("CurrentDateTime", () => {

        var a = new Date(); 
        var res = new Date(util.CurrentDateTime());

        expect(res - a).toBeLessThan(5); 

    });

    test("getPerfStartTime Function", () => {
        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-01-31T00:00:00.000Z"
        };
        config.load.mockReturnValue(configjson)
        var d = new Date("2020-01-01T00:00:00.000Z");
        expect(util.getPerfStartTime()).toEqual(d.toISOString());


        var configjson = {
            "ProductType": "Prod",
            "SRMDevLastDT": "2020-01-31T00:00:00.000Z"
        };
        config.load.mockReturnValue(configjson)
        var d = new Date();
        var a = new Date(d.getTime() - (86400000 * 30) + 6);
        var res = new Date(util.getPerfStartTime());

        expect(res - a).toBeLessThan(5);
    });

    test("getlastMonthByDate", () => {

        var testday = '2020-05-10T01:10:10.100+08:00';
        var firstday = '2020-04-01T00:00:00.000+08:00';
        var lastday = '2020-05-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getlastMonthByDate(testday)).toEqual(res);

        var testday = '2020-05-01T00:00:00.000+08:00';
        expect(util.getlastMonthByDate(testday)).toEqual(res);

        var testday = '2020-05-31T23:59:59.999+08:00';
        expect(util.getlastMonthByDate(testday)).toEqual(res);

        var testday = '2020-01-01T23:59:59.999+08:00';
        var firstday = '2019-12-01T00:00:00.000+08:00';
        var lastday = '2020-01-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getlastMonthByDate(testday)).toEqual(res);

        var testday = '2020-02-11T23:59:59.999+08:00';
        var firstday = '2020-01-01T00:00:00.000+08:00';
        var lastday = '2020-02-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getlastMonthByDate(testday)).toEqual(res);

        var testday = '2020-12-11T23:59:59.999+08:00';
        var firstday = '2020-11-01T00:00:00.000+08:00';
        var lastday = '2020-12-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getlastMonthByDate(testday)).toEqual(res);


    });


    test("getlastYearByDate Function", () => {

        var testday = '2020-05-10T01:10:10.100+08:00';
        var firstday = '2019-01-01T00:00:00.000+08:00';
        var lastday = '2020-01-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getlastYearByDate(testday)).toEqual(res);

        var testday = '2020-01-01T00:00:00.000+08:00';
        expect(util.getlastYearByDate(testday)).toEqual(res);

        var testday = '2020-12-31T23:59:59.999+08:00';
        expect(util.getlastYearByDate(testday)).toEqual(res);

    });


    test("getLastMonth", () => {
        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-05-10T11:00:00.000Z"
        };
        config.load.mockReturnValue(configjson)
        var firstday = '2020-04-01T00:00:00.000+08:00';
        var lastday = '2020-05-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getLastMonth()).toEqual(res);


        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-01-10T11:00:00.000Z"
        };
        config.load.mockReturnValue(configjson)
        var firstday = '2019-12-01T00:00:00.000+08:00';
        var lastday = '2020-01-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getLastMonth()).toEqual(res);

        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-03-10T11:00:00.000Z"
        };
        config.load.mockReturnValue(configjson)
        var firstday = '2020-02-01T00:00:00.000+08:00';
        var lastday = '2020-03-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getLastMonth()).toEqual(res);


        var configjson = {
            "ProductType": "Prod"
        };
        config.load.mockReturnValue(configjson);
        var d1 = new Date();

        var firstday = `${d1.getFullYear()}-0${d1.getMonth()}-01T00:00:00.000+08:00`;
        var lastday = `${d1.getFullYear()}-0${d1.getMonth() + 1}-01T00:00:00.000+08:00`;
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getLastMonth()).toEqual(res);

    });

    test("getLastYear", () => {
        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-05-10T11:00:00.000Z"
        };
        config.load.mockReturnValue(configjson)
        var firstday = '2019-01-01T00:00:00.000+08:00';
        var lastday = '2020-01-01T00:00:00.000+08:00';
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getLastYear()).toEqual(res);


        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-01-01T00:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        expect(util.getLastYear()).toEqual(res);

        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-12-31T23:59:59.999+08:00"
        };
        config.load.mockReturnValue(configjson)
        expect(util.getLastYear()).toEqual(res);


        var configjson = {
            "ProductType": "Prod"
        };
        config.load.mockReturnValue(configjson);
        var d1 = new Date();

        var firstday = `${d1.getFullYear() - 1}-01-01T00:00:00.000+08:00`;
        var lastday = `${d1.getFullYear()}-01-01T00:00:00.000+08:00`;
        var res = { firstDay: firstday, lastDay: lastday }
        expect(util.getLastYear()).toEqual(res);

    });

    test("getRealtimeDateTimeByDay", () => {
        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-05-10T11:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        var begin = '2020-05-08T00:00:00.000+08:00';
        var end = '2020-05-09T00:00:00.000+08:00';
        var res = { begin: begin, end: end }

        expect(util.getRealtimeDateTimeByDay(-2)).toEqual(res);


        var begin = '2020-05-12T00:00:00.000+08:00';
        var end = '2020-05-13T00:00:00.000+08:00';
        var res = { begin: begin, end: end }

        expect(util.getRealtimeDateTimeByDay(2)).toEqual(res);

        var begin = '2020-05-10T00:00:00.000+08:00';
        var end = '2020-05-11T00:00:00.000+08:00';
        var res = { begin: begin, end: end }

        expect(util.getRealtimeDateTimeByDay(0)).toEqual(res);

        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-03-01T11:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        var begin = '2020-02-29T00:00:00.000+08:00';
        var end = '2020-03-01T00:00:00.000+08:00';
        var res = { begin: begin, end: end }

        expect(util.getRealtimeDateTimeByDay(-1)).toEqual(res);


        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-02-29T11:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        var begin = '2020-03-01T00:00:00.000+08:00';
        var end = '2020-03-02T00:00:00.000+08:00';
        var res = { begin: begin, end: end }

        expect(util.getRealtimeDateTimeByDay(1)).toEqual(res);


        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-01-01T11:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        var begin = '2019-12-31T00:00:00.000+08:00';
        var end = '2020-01-01T00:00:00.000+08:00';
        var res = { begin: begin, end: end }

        expect(util.getRealtimeDateTimeByDay(-1)).toEqual(res);

        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2019-12-31T11:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        var begin = '2020-01-01T00:00:00.000+08:00';
        var end = '2020-01-02T00:00:00.000+08:00';
        var res = { begin: begin, end: end }

        expect(util.getRealtimeDateTimeByDay(1)).toEqual(res);

    });



    test("getFirstDayofMonth", () => {

        var d = '2020-05-08T08:00:00.000+08:00';
        var begin = '2020-05-01T00:00:00.000+08:00';
        var end = '2020-06-01T00:00:00.000+08:00';
        var res = { firstDay: begin, lastDay: end }
        expect(util.getFirstDayofMonth(d)).toEqual(res);


        var d = '2020-01-08T08:00:00.000+08:00';
        var begin = '2020-01-01T00:00:00.000+08:00';
        var end = '2020-02-01T00:00:00.000+08:00';
        var res = { firstDay: begin, lastDay: end }
        expect(util.getFirstDayofMonth(d)).toEqual(res);
    });

    test("isWorkingTime", () => {

        var begin = new Date('2020-05-08T08:00:00.000+08:00');
        expect(util.isWorkingTime(begin.getTime() / 1000)).toEqual(true);

        var begin = new Date('2020-05-08T17:00:00.000+08:00');
        expect(util.isWorkingTime(begin.getTime() / 1000)).toEqual(true);

        var begin = new Date('2020-05-08T12:00:00.000+08:00');
        expect(util.isWorkingTime(begin.getTime() / 1000)).toEqual(true);


        var begin = new Date('2020-05-08T20:00:00.000+08:00');
        expect(util.isWorkingTime(begin.getTime() / 1000)).toEqual(false);

        var begin = new Date('2020-05-08T07:00:00.000+08:00');
        expect(util.isWorkingTime(begin.getTime() / 1000)).toEqual(false);

    });


    describe('getConfStartTime', () => {

        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-05-10T11:00:00.000+08:00"
        };
 
        var cases = [
            ['1h', '2020-05-09T11:00:00.000+08:00'],
            ['1d', '2020-05-08T11:00:00.000+08:00'],
            ['1w', '2020-05-03T11:00:00.000+08:00'],
            ['2w', '2020-04-26T11:00:00.000+08:00'],
            ['1m', '2020-04-10T11:00:00.000+08:00'],
            ['', '2020-05-03T11:00:00.000+08:00']];

        test.each(cases)('%s', (type, res) => {
            config.load.mockReturnValue(configjson)
            expect(util.getConfStartTime(type)).toEqual(res);
        })
    });



    test("getPerfEndTime", () => {
        var configjson = {
            "ProductType": "Test",
            "SRMDevLastDT": "2020-05-10T11:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        var res = configjson.SRMDevLastDT;
        expect(util.getPerfEndTime()).toEqual(res);


        var configjson = {
            "ProductType": "Prod",
            "SRMDevLastDT": "2020-05-10T11:00:00.000+08:00"
        };
        config.load.mockReturnValue(configjson)
        var s = new Date();
        var res = moment(s).format('YYYY-MM-DD') + 'T' + moment(s).format('HH:mm:ss.SSSZ')
        expect(util.getPerfEndTime()).toEqual(res);

    });



});


describe("UTIL other function", () => {
    test("MergeAndDistinctItem", () => {

        var s = [
            { "key1": "value1-1", "key2": "value2-1", "key3": "value3-1" },
            { "key1": "value1-2", "key2": "value2-2", "key3": "value3-2" },
            { "key1": "value1-3", "key2": "value2-3", "key3": "value3-3" } 
        ]
        var t = [
            { "key1": "value-t-1-1", "key4": "value4-1", "key5": "value5-1" },
            { "key1": "value1-2", "key4": "value4-2", "key5": "value5-2" },
            { "key1": "value-t-1-3", "key4": "value4-3", "key5": "value5-3" } 
        ] 

        var res = [
            { "key1": "value-t-1-1", "key4": "value4-1", "key5": "value5-1" },
            { "key1": "value1-2", "key4": "value4-2", "key5": "value5-2" },
            { "key1": "value-t-1-3", "key4": "value4-3", "key5": "value5-3" } ,
            { "key1": "value1-1", "key2": "value2-1", "key3": "value3-1" }, 
            { "key1": "value1-3", "key2": "value2-3", "key3": "value3-3" } 
        ] 

        //console.log(util.MergeAndDistinctItem(s,t,"key1"))
        expect(util.MergeAndDistinctItem(s,t,"key1")).toEqual(res);

    });

})