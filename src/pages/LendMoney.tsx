import ProposalWizard from "@/components/ProposalWizard";

/** Offering someone a loan. The flow itself is shared with BorrowMoney. */
const LendMoney = () => <ProposalWizard direction="lend" presetAmounts={[500, 1000, 1500, 3000]} />;

export default LendMoney;
