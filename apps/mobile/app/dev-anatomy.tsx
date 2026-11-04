import { Redirect } from "expo-router";

import { AnatomyPreviewScreen } from "@/features/anatomy/AnatomyPreviewScreen";

/** Dev-only AMI-162 anatomy + tier badge gallery. Release builds redirect home. */
const DevAnatomy = () => (__DEV__ ? <AnatomyPreviewScreen /> : <Redirect href="/" />);

export default DevAnatomy;
