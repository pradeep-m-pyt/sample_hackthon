export const formatToWords = (num: number) => {
    if (!num) return "₹0";
    const absNum = Math.abs(num);
    let str = "";

    if (absNum >= 10000000) {
        str = `${(absNum / 10000000).toFixed(2)} Cr`;
    } else if (absNum >= 100000) {
        str = `${(absNum / 100000).toFixed(2)} Lakh`;
    } else if (absNum >= 1000) {
        str = `${(absNum / 1000).toFixed(2)} K`;
    } else {
        str = `${absNum.toFixed(0)}`;
    }

    return num < 0 ? `-₹${str}` : `₹${str}`;
};
