//var pdf = require('html-pdf');
var uuid = require('uuid');
const co2calculator = require ('../co2calculator.js');
const awsuploader = require('../awsuploader')
const fs = require('fs')
const Promise = require('bluebird');
const pdf = Promise.promisifyAll(require('html-pdf'));
var ejs = require('ejs');


const createData = async (req, res) =>{ 
    const { body } = req;
    if (!body.vehicle ||
        !body.distance || 
        !body.domesticAppliances ||
        !body.nutrition || 
        !body.plantedTrees)
        {
            res.send("ningun campo puede quedar vacio!");
        }
    for(var i = 0; i <= 6; i++){
        if (!body.domesticAppliances[i].name || !body.domesticAppliances[i].amount){
            res.send("falta datos en el electrodomestico numero: " + i + " !")
        }
    }

    newData = {
        vehicle : body.vehicle,
        distance : body.distance,
        domesticAppliances : body.domesticAppliances,
        nutrition : body.nutrition,
        plantedTrees : body.plantedTrees
    };
    
    var vehicleEmission = co2calculator.calculateVehicleCO2(newData.vehicle, newData.distance)

    var domesticAppliancesEmission = co2calculator.calculateDomesticAppliancesCO2(newData.domesticAppliances)

    var nutritionEmission = co2calculator.calculateNutritionCO2(newData.nutrition)

    var emissionContrarested = newData.plantedTrees * 40
    var totalEmission = (vehicleEmission + domesticAppliancesEmission + nutritionEmission ) - emissionContrarested

    var treesShouldPlant = Math.trunc(totalEmission / 40)

    console.log("total User emission: " + totalEmission + " CO2 kg")
    console.log("User shoul Plant : " + treesShouldPlant + " trees")


    
    var compiled = ejs.compile(fs.readFileSync(__dirname + '/template.html', 'utf8'));
    var html = compiled({ emission : totalEmission, treesShoulPlant : treesShouldPlant})
    var pdfid = uuid.v4()
    pdfPath = (`./pdf/${pdfid}.pdf`)

    async function pdfGenerator(){
        var res = await pdf.createAsync(html, {filename: pdfPath});
        console.log("pdf generated at " + res.filename);
    }

    await pdfGenerator();
    var amazonResponse = await awsuploader.uploadPdfToS3(pdfid)
    res.status(201).send({ status : "OK", objectURL: amazonResponse});
    
    //delete pdf from server (is already allowed in the s3 bucket)
    try {
        fs.unlinkSync(pdfPath)
            console.log("file deleted from server")
      } catch(err) {
        console.error("error deleting file from server: " + err)
      }
    };


module.exports = {
    createData,
};
