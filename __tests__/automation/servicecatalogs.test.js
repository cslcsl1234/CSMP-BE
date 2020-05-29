const FUNC = require('../../lib/automation/servicecatalogs')


describe("Service Catalogs", () => {

    test("ServiceCatalogs.GetServiceCatalog", () => { 

        var catalog;
        var name;
        var data = FUNC.GetServiceCatalog(catalog, name); 
        expect(data.length).toBeGreaterThan(0);

        var catalog='Block';
        var name;
        var data = FUNC.GetServiceCatalog(catalog, name);   
        expect(data.name).toBe("块服务");

        var catalog;
        var name='块服务';
        var data = FUNC.GetServiceCatalog(catalog, name);  
        expect(data.catalog).toBe("Block");

    }, 20000)

})
