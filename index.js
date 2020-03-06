const request = require('request');
const cheerio = require('cheerio');

// const STOCK_URl = 'https://tw.stock.yahoo.com/d/s/company_1101.html';
const COMPANY_URL = 'https://tw.stock.yahoo.com/h/kimosel.php?tse=1&cat=%E6%B0%B4%E6%B3%A5&form=menu&form_id=stock_id&form_name=stock_name&domain=0';
const key = ['營業毛利率', '營業利益率', '稅前淨利率', '資產報酬率', '股東權益報酬率']
function getStockLink(company) {
	return `https://tw.stock.yahoo.com/d/s/company_${company}.html`;
}
function getStockInfo(url ) {
	return new Promise(function(resolve, reject){
		request(url, function(err, res, body) {
			const $ = cheerio.load(body)
			const tables = $('table')
			const financialStatement = tables.eq(3).children('tbody').children('tr').slice(1)
			const companyInfo = {
				url,
				profitability: {},
				epsOfSeasons: {},
				epsOfYears: {},
				eps: 0,
			};
			const companys = [];
			$(financialStatement).each(function(index, elem) {
				const content = $(this).children('td');
				const filterText = /[A-Za-z\&\#\;\~\@]/g;
				companyInfo.profitability[key[index]] = content.eq(1).text()
				if( index != 4) {
					const seasonNum = content.eq(2).html().replace(filterText,'')
					const seasonText = `${seasonNum.slice(0,3)}年 第${seasonNum.slice(3)}季`
					const seasonEps = content.eq(3).html().replace(filterText,'')
					companyInfo.epsOfSeasons[seasonText] = seasonEps
					const yearText = content.eq(4).html().replace(filterText,'') + "年"
					const yearEps = content.eq(5).html().replace(filterText,'')
					companyInfo.epsOfYears[yearText] = yearEps
				} else {
					companyInfo.eps = content.eq(2).html().replace(filterText,'').replace('472: ', '') + "元"
				}
			});
			resolve(companyInfo)
		})
	})
}

function getCompanySuffixLinks(url) {
	return new Promise(function(resolve, reject){
		request(url, function(err, res, body) {
			const links = [];
			const $ = cheerio.load(body)
			const tables = $('table')
			const NO_USE_INDEX = [13, 30, 32]
			const companyTable = tables.eq(4).children('tbody').children('tr').children('td')
			$(companyTable).each(function(index, elem) {
				const link = $(this).find('a').attr('href')
				if(link) {
					if(!NO_USE_INDEX.includes(index)) {
						links.push(link)
					}
				}
			})
			resolve(links)
		})
	})
}

function getCompanyLinks(companyLinks){
	const PREFIX_URL = 'https://tw.stock.yahoo.com'
	const links = companyLinks.map(link => `${PREFIX_URL}${link}`)
	return links;
}

async function getCompanyId(url) {
	return new Promise(function(resolve, reject){
		request(url, function(err, res, body){
			const $ = cheerio.load(body)
			const tables = $('table')
			const table = tables.eq(5).children('tbody').children('tr').children('td')
			const companyIds = []
			$(table).each(function(index,elem) {
				const content = $(this).find('a').text()
				const filterText = /[A-Za-z\&\#\;\~\@]/g;
				content.replace(filterText,'').split("\n").forEach(item => {
					const id = item.split('').map((item,index) => index > 3 ? '' : item ).join('')
					if(!companyIds.includes(id) && id) {
						companyIds.push(id)
					}
				})
			})
			resolve(companyIds)
		})
	})
}

getCompanySuffixLinks(COMPANY_URL)
	.then(suffixLink => getCompanyLinks(suffixLink))
	.then(async (companyLinks) => {
		const ids = companyLinks.map(async (link) => {
			return await getCompanyId(link)
				.then(ids => ids)
		})
		return await Promise.all(ids)
	})
	.then(ids => ids.reduce((array, currentValue) => [...array, ...currentValue], []))
	.then(ids => ids.filter(item => {
		if(!Number.isNaN(Number(item))) {
			return item
		}
	}))
	.then(ids => ids.map(id => getStockLink(id)))
	.then(async (stockLinks) => {
		const companys = [];
		for(let i=0 ; i <= stockLinks.length ; i++ ) {
			const company = await getStockInfo(stockLinks[i])
			const isEligible = Object.values(company.epsOfYears).every(eps => Number(eps) > 1.5)
			if (isEligible) {
				companys.push(company)
				console.log(company)
			}
		}
		console.log(companys)
	})
