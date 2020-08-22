"use strict";
const logger = require("../lib/logger")(__filename); 

module.exports = {
    RecordFlat,
    RecordFlatMaxValue

}

function RecordFlat_old(originRecord, keys ) {

        var resultCount = 0;
        var resultFinal = [];
        var sourceArray = JSON.parse(originRecord).values; 
 
        for ( var i in sourceArray ) {
            var item = sourceArray[i];

            var pointsLengh = item.points.length;
            var lastPointValue = item.points[pointsLengh - 1][1];

            var lastPointTS = item.points[pointsLengh - 1][0];
            var metricsName = item.properties.name; 

            var properties = item.properties;
            delete properties.name;
            properties[metricsName] = lastPointValue;
            properties['LastTS'] = lastPointTS;
            
            //logger.info(properties);
            //logger.info(item);
            if ( resultFinal.length == 0 ) {
                //logger.info('the flat record is empty! push a member.');
                resultFinal.push(properties);
                resultCount++;
            }
            else {
 
                var isFind = false;
                for ( var j in resultFinal) {
                    var resultItem = resultFinal[j];

                    for ( var keyi=0 ; keyi < keys.length; keyi++ ) {
                        var keyItem = keys[keyi];
                        if ( resultItem[keyItem] == properties[keyItem] ) 
                            isFind = true;
                        else {
                            isFind = false;
                            break;
                        }
                    }

                    if ( isFind == true ) {
                            //logger.info('metricsName=' + metricsName +',' + lastPointValue );
                            //logger.info(resultItem);
                            resultItem[metricsName] = lastPointValue;
                            mergeJsonObj(resultItem,properties); 
                            break;
                    }
                   
                }
 
                if ( isFind == false ) {
                    resultFinal.push(properties);
                    resultCount++;
                }
                //resultFinal['LastTS'] = lastPointTS;
            }

        } 
        //logger.info("RecordFlat: RecordCount=" + resultCount );
        //response.end(resultFinal);
        return resultFinal;
    };

function mergeJsonObj(target, sources) { 
    for ( var i in sources ) {
        target[i] = sources[i];
    }
    return target;
};



function RecordFlat(originRecord, keys ) {

        var resultCount = 0;
        var resultFinal = [];
        var resultFinalTmp = {};
        var sourceArray = JSON.parse(originRecord).values; 
 
        for ( var i in sourceArray ) {
            var item = sourceArray[i];

            var metricsName = item.properties.name; 

            var keyValue ='';
            for ( var keyi=0 ; keyi < keys.length; keyi++ ) {
                var keyItem = keys[keyi];
                keyValue = keyValue + item.properties[keyItem] 
            } 

            var lastPointValue = 'n/a';
            if ( item.points !== undefined && item.points != '' ) { 
                var pointsLengh = item.points.length; 
                lastPointValue = item.points[pointsLengh - 1][1];
                var lastPointTS = item.points[pointsLengh - 1][0]; 
            }

             
            if ( typeof resultFinalTmp[keyValue] === 'undefined') {
                var properties = item.properties;
                resultFinalTmp[keyValue] = properties;
            }
            else 
                var properties = resultFinalTmp[keyValue];

            //delete properties.name;   
            if ( metricsName !== undefined ) properties[metricsName] = lastPointValue;
            if ( lastPointTS !== undefined ) properties['LastTS'] = lastPointTS;   
 

        }  
        for ( let i in resultFinalTmp ) {
            var item = resultFinalTmp[i];
            resultFinal.push(item); 
        }
        //logger.info( resultFinalTmp );
        //logger.info("RecordFlat: RecordCount=" + resultCount );
        //response.end(resultFinal);
        return resultFinal;
    };

function RecordFlatMaxValue(originRecord, keys ) {

        var resultCount = 0;
        var resultFinal = [];
        var resultFinalTmp = {};
        var sourceArray = JSON.parse(originRecord).values; 
 
        //logger.info("----------- MAX Value --------------\n" + originRecord );
        for ( var i in sourceArray ) {
            var item = sourceArray[i];

            var metricsName = item.properties.name; 

            var keyValue ='';
            for ( var keyi=0 ; keyi < keys.length; keyi++ ) {
                var keyItem = keys[keyi];
                keyValue = keyValue + item.properties[keyItem] 
            } 

            if ( item.points !== undefined && item.points != '') { 
                var pointsLengh = item.points.length; 
                var PointValue = 0;
                for ( var j in item.points ) {
                    var valueItem = item.points[j];
                    if ( Number(valueItem[1]) > PointValue ) PointValue = Number(valueItem[1]); 
                    //logger.info(item.properties.device + ',' + item.properties.feport + ',' + metricsName +'=' +Number(valueItem[1]), PointValue);
                }
                var lastPointValue = PointValue;
                var lastPointTS = item.points[pointsLengh - 1][0]; 
                          
            }  



            if ( typeof resultFinalTmp[keyValue] === 'undefined') {
                var properties = item.properties;
                resultFinalTmp[keyValue] = properties;
            }
            else 
                var properties = resultFinalTmp[keyValue];

            //delete properties.name;   
            properties[metricsName] = lastPointValue;
            properties['LastTS'] = lastPointTS;   
 

        }  
        for ( let i in resultFinalTmp ) {
            var item = resultFinalTmp[i];
            resultFinal.push(item); 
        }
        //logger.info( resultFinalTmp );
        //logger.info("RecordFlat: RecordCount=" + resultCount );
        //response.end(resultFinal);
        return resultFinal;
    };