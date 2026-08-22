/**
 * Cents to dollars, once, for the three places in this room that print money.
 *
 * There were three byte-identical hand-rolled copies of this, and all three broke
 * the moment an amount reached four figures. They emitted "1000.00" with no
 * thousands separator, which the genesis balance crosses.
 *
 * The locale is pinned rather than taken from the visitor, because the invented
 * accounts are denominated in US dollars and the room's own prose says so. A
 * visitor in Berlin should read the same figure the copy is describing.
 */
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const dollars = (cents: number) => USD.format(cents / 100);
