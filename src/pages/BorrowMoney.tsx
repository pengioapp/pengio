import ProposalWizard from "@/components/ProposalWizard";

/** Asking someone for a loan. The flow itself is shared with LendMoney. */
const BorrowMoney = () => <ProposalWizard direction="borrow" presetAmounts={[1000, 1500, 2000, 4000]} />;

export default BorrowMoney;
