import { createGateEntrySchema } from "../packages/shared/src/index.ts";

const data = {
  crewPassId: "b0b2e8c2-487b-402d-9af2-0b13cf0bb420",
  customerDestination: "TEST DEST",
  actualTankTruckNumber: "TN1234",
  abs: false, // NO selected
  driverSignatureConfirmed: true,
  safetyChecklist: {
    drivingLicenseValidCmvRule9: false, // NO selected
    ppeAvailable: false,
    rubberHoseCumLockCouplingGttMarked: false,
    sparkArrestorCcoeApproved: false,
    tremCardAndTrainingCardAvailable: false,
    selfStarterWorking: false,
    batteryTerminalRubberCovers: false,
    noContainerCanExplosivesInCabin: false,
    vmuWorking: false,
    batteryCutOffSwitchCondition: false,
    handBrakeWorking: false,
    earthCleatProvided: false,
  }
};

const result = createGateEntrySchema.safeParse(data);
console.log("Success:", result.success);
if (!result.success) {
  console.log("Errors:", JSON.stringify(result.error.format(), null, 2));
} else {
  console.log("Data:", result.data);
}
