const request = require('request');
const cheerio = require('cheerio');

const url = 'https://tw.stock.yahoo.com/d/s/company_1101.html';
const key = ['營業毛利率', '營業利益率', '稅前淨利率', '資產報酬率', '股東權益報酬率']
function getStockInfo(url, callback) {
	request(url, function(err, res, body) {
		const $ = cheerio.load(body)
		const tables = $('table')
		const financialStatement = tables.eq(3).children('tbody').children('tr').slice(1)
		const data = {
			profitability: {},
			epsOfSeasons: {},
			epsOfYears: {},
			eps: 0,
		};
		$(financialStatement).each(function(index, elem) {
			const content = $(this).children('td');
			const filterText = /[A-Za-z\&\#\;\~\@]/g;
			data.profitability[key[index]] = content.eq(1).text()
			if( index != 4) {
				const seasonNum = content.eq(2).html().replace(filterText,'')
				const seasonText = `${seasonNum.slice(0,3)}年 第${seasonNum.slice(3)}季`
				data.epsOfSeasons[seasonText] = content.eq(3).html().replace(filterText,'') + "元"
				const yearText = content.eq(4).html().replace(filterText,'') + "年"
				data.epsOfYears[yearText] = content.eq(5).html().replace(filterText,'') + "元"
			} else {
				console.log(content.eq(2).html())
				data.eps = content.eq(2).html().replace(filterText,'').replace('472: ', '') + "元"
			}
		});
		console.log(data)
	})
}

getStockInfo(url);