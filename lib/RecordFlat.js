"use strict"; 


function RecordFlat(originRecord, keys ) {
        
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
            
            //console.log(properties);
            //console.log(item);

            if ( resultFinal.length == 0 ) {
                //console.log('the flat record is empty! push a member.');
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
                            //console.log('metricsName=' + metricsName +',' + lastPointValue );
                            //console.log(resultItem);
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
        //console.log("RecordFlat: RecordCount=" + resultCount );
        //response.end(resultFinal);
        return resultFinal;
    };

function mergeJsonObj(target, sources) { 
    for ( var i in sources ) {
        target[i] = sources[i];
    }
    return target;
}


module.exports = RecordFlat;