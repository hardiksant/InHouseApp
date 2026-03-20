interface OrderForSlip {
  order_number: string;
  customer_name: string;
  full_address: string;
  city: string;
  state: string;
  pin_code: string;
  mobile_number: string;
}

export function printOrderSlips(orders: OrderForSlip[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print slips');
    return;
  }

  const slipsHTML = orders
    .map(
      (order) => `
      <div class="slip">
        <div class="to-section">
          <div class="label">TO:</div>
          <div class="customer-name">${order.customer_name}</div>

          <div class="label" style="margin-top: 8px;">Address:</div>
          <div class="address">${order.full_address}</div>
          <div class="address">${order.city}, ${order.state}</div>

          <div class="contact-info">
            <div><span class="label">Pin:</span> ${order.pin_code}</div>
            <div><span class="label">Mo:</span> ${order.mobile_number}</div>
          </div>
        </div>

        <div class="return-section">
          <div class="label">Return Address:</div>
          <div class="return-address">
            <strong>Nepali Rudraksh Wala</strong><br/>
            FF/3/23 Housing Board Colony<br/>
            Near Water Tank<br/>
            Pratapgarh Rajasthan<br/>
            Pincode: 312605<br/>
            Mobile: 6376315465
          </div>
        </div>
      </div>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Order Slips - Print</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          @page {
            size: A4;
            margin: 5mm;
          }

          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.3;
          }

          .slip {
            width: 10cm;
            height: 9cm;
            border: 2px solid #000;
            padding: 8mm;
            margin: 3mm;
            float: left;
            box-sizing: border-box;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .label {
            font-weight: bold;
            font-size: 10pt;
          }

          .customer-name {
            font-size: 13pt;
            font-weight: bold;
            margin-top: 2px;
          }

          .address {
            font-size: 10pt;
            margin-top: 1px;
          }

          .contact-info {
            margin-top: 6px;
            font-size: 10pt;
          }

          .contact-info div {
            margin-top: 2px;
          }

          .return-section {
            border-top: 1px solid #666;
            padding-top: 5mm;
            font-size: 8pt;
          }

          .return-address {
            margin-top: 3px;
            line-height: 1.4;
          }

          @media print {
            .slip {
              margin: 0;
            }

            @page {
              margin: 5mm;
            }
          }
        </style>
      </head>
      <body>
        ${slipsHTML}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 500);
}
