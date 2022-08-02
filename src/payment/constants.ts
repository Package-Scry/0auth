export const STRIPE_MONTHLY_ID = "price_1KsZ4ZEbki2GiZihrbfz68np"
export const STRIPE_YEARLY_ID = "price_1KsZ4ZEbki2GiZihRGuM1sPR"
export const TRIAL_AMOUNT_DAYS = 30
export const STRIPE_API_KEY = process.env.STRIPE_TEST_KEY ?? ""

export enum PlanPeriods {
  Monthly = "monthly",
  Yearly = "annual",
}
