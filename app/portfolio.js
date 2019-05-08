const RestServerUrl = 'http://localhost:22910/';
const RestServerEndpoint = 'GetDemoPortfolio';
const StreamName = 'T42.MarketStream.Subscribe';

let detachedTabs = [];
let subscriptions = [];
let _query;
let partyObj;

let serviceMetricsSystem;
let serviceErrorCount;
let lastServiceError;
let serviceLatency;
let logger;

// SOLVED TUTOR_TODO Chapter 1.2 Task 4
Glue(glueConfig)
    .then((glue) => {
        window.glue = glue;
        instrumentService();
        onInitializeApp();
        initInstrumentSearch();
        trackTheme();

        // SOLVED TUTOR_TODO Chapter 8 Task 3
        const glue4OfficeOptions = {
            glue: glue,
            outlook: true,
            // SOLVED TUTOR_TODO Chapter 9 Task 2
            excel: true
        };

        // SOLVED TUTOR_TODO Chapter 8 Task 4
        return Glue4Office(glue4OfficeOptions);
    })
    .then((g4o) => {
        window.outlook = g4o.outlook;
        window.excel = g4o.excel;
    })
    .catch((err) => {
        console.log(err);
    });


const instrumentService = () => {

    // SOLVED TUTOR_TODO Chapter 12 Task 1
    logger = glue.logger.subLogger('PortfolioWindow');

    // SOLVED TUTOR_TODO Chapter 12 Task 3
    serviceMetricsSystem = glue.metrics.subSystem('PortfolioSystem', 'Portfolio REST Service');
    serviceMetricsSystem.setState(0, 'OK');

    // SOLVED TUTOR_TODO Chapter 12 Task 4
    const errorCountOptions = {
        name: 'ErrorCount',
        description: 'Records the number of failed requests'
    };
    serviceErrorCount = serviceMetricsSystem.countMetric(errorCountOptions, 0);

    // SOLVED TUTOR_TODO Chapter 12 Task 5
    const lastErrorOptions = {
        name: 'lastError',
        description: 'last recorded service error'
    };
    const initialValue = {
        clientId: '',
        time: new Date(),
        message: '',
        stackTrace: ''
    }
    lastServiceError = serviceMetricsSystem.objectMetric(lastErrorOptions, initialValue);

    // SOLVED TUTOR_TODO Chapter 12 Task 6
    const latencyOptions = {
        name: 'latency',
        description: 'request latency'
    }
    serviceLatency = serviceMetricsSystem.timespanMetric(latencyOptions);
};

const onInitializeApp = () => {
    if (glue.agm) {
        glue.agm.register({
            name: 'Alert symbol',
            objectTypes: ['Instrument'],
        },
            (args) => {
                alert(args.instrument.ric);
            });
        glue.agm.register({
            name: 'Alert bpod',
            objectTypes: ['Instrument'],
        },
            (args) => {
                alert(args.instrument.bpod);
            });

    }

    setUpAppContent();
    setUpStreamIndicator();
    setUpGlueIndicator();
    setUpWindowEventsListeners();
    setUpTabControls();
};

const initInstrumentSearch = () => {

    // SOLVED TUTOR_TODO Chapter 6 Task 2
    const gssOptions = {
        agm: glue.agm,
        defaultQueryLimit: 500,
        measureLatency: false,
        searchTimeoutInMillis: 10000,
        debugGss: false,
        debug: false
    };

    const searchClient = new gssClientSearch.create(gssOptions);

    _query = searchClient.createQuery('Instrument');

    _query.onData((entities) => {
        displayResult(entities);
    });

};

const trackTheme = () => {
    const setTheme = (name) => {
        $('#themeLink').attr('href', '../lib/themes/css/' + name);
    }

    // SOLVED TUTOR_TODO Chapter 10 Task 2
    glue.contexts.subscribe('theme', (theme) => {
        if (theme.name == 'dark') {
            setTheme('bootstrap-dark.min.css');
            return;
        }
        setTheme('bootstrap.min.css');
    });
};

const setUpAppContent = () => {

    // SOLVED TUTOR_TODO chapter 4.3 Task 2
    const context = glue.windows.my().context;
    if (context.party) {
        const preferredName = context.party.preferredName;
        glue.windows.my().setTitle(preferredName);
        document.getElementById('title').textContent = preferredName;
        partyObj = context.party;
        loadPortfolio(context.party.pId);
        return;
    }

    registerAgmMethod();
};

const registerAgmMethod = () => {

    // SOLVED TUTOR_TODO Chapter 11 Task 3
    const inActivity = glue.activities.inActivity;

    if (inActivity) {
        glue.activities.my.onContextChanged((client) => {
            if (client.party) {
                loadPortfolio(client.party.pId);
            }
        });
        return;
    }

    // SOLVED TUTOR_TODO Chapter 2.1
    const methodOptions = {
        name: 'SetParty',
        display_name: 'Set Party',
        description: 'Switches the application window to work with the specified party',
        accepts: 'Composite: { String? pId, String? ucn } party'
    };

    glue.agm.register(methodOptions, (args) => {
        partyObj = args.party;
        loadPortfolio(args.party.pId);
    });

};

const loadPortfolio = (portf) => {
    const serviceUrl = RestServerUrl + RestServerEndpoint;

    const serviceRequest = 'xpath=//Portfolios/Portfolio[id=' + portf + ']';

    const requestStart = Date.now();

    // SOLVED TUTOR_TODO Chapter 12 Task 7
    serviceLatency.start();

    const ajaxOptions = {
        method: 'GET',
        url: serviceUrl,
        data: serviceRequest
    };

    $.ajax(ajaxOptions)
        .done((portfolio) => {
            // SOLVED TUTOR_TODO Chapter 12 Task 8
            serviceLatency.stop();

            const elapsedMillis = Date.now() - requestStart;

            if (elapsedMillis >= 1000) {
                const message = 'Service at ' + serviceUrl + ' is lagging';
                // SOLVED TUTOR_TODO Chapter 12 Task 10
                serviceMetricsSystem.setState(50, message);
            } else {
                // SOLVED TUTOR_TODO Chapter 12 Task 11
                serviceMetricsSystem.setState(0, 'OK');
            }

            let parsedPortfolio;
            if (typeof portfolio !== 'undefined') {
                parsedPortfolio = JSON.parse(portfolio);
            }

            const logMessage = { portfolioId: portf, portfolio: parsedPortfolio };
            // SOLVED TUTOR_TODO Chapter 12 Task 2
            logger.info(logMessage);

            if (!parsedPortfolio.Portfolios.hasOwnProperty('Portfolio')) {
                console.warn('The client has no portfolio')
                return;
            }

            setupPortfolio(parsedPortfolio.Portfolios.Portfolio.Symbols.Symbol);
            unsubscribeSymbolPrices();
            subscribeSymbolPrices();
        })
        .fail(function (jqXHR, textStatus) {
            // SOLVED TUTOR_TODO Chapter 12 Task 9
            serviceLatency.stop();

            // TUTOR_TODO Chapter 12 Task 12
            // Increment the error count.

            const errorMessage = 'Service at ' + serviceUrl + ' failed at ' + serviceRequest + ' with ' + textStatus;

            const errorOptions = {
                clientId: portf,
                message: errorMessage,
                time: new Date(),
                stackTrace: ''
            };

            // TUTOR_TODO Chapter 12 Task 13
            // Capture the error with the composite metric and use the provided errorOptions object.

            // TUTOR_TODO Chapter 12 Task 14
            // Set the system state to RED and pass the provided error message.
        })
}

const subscribeSymbolPrices = () => {
    const trs = document.querySelectorAll('#portfolioTableData tr');

    trs.forEach((tr) => {
        const symbol = tr.getAttribute('id');

        subscribeBySymbol(symbol, updateInstruments)
    })
}

const unsubscribeSymbolPrices = () => {

    // SOLVED TUTOR_TODO Chapter 3 Task 2
    subscriptions.forEach((subscription) => {
        subscription.close();
    });

}

const subscribeBySymbol = (symbol, callback) => {

    // SOLVED TUTOR_TODO Chapter 3 Task 1
    const options = {
        arguments: {
            Symbol: symbol
        }
    };

    glue.agm.subscribe('T42.MarketStream.Subscribe', options)
        .then((subscription) => {
            subscriptions.push(subscription);
            subscription.onData((subscriptionData) => {
                callback(subscriptionData);
            })
        })

}

const addRow = (table, rowData, emptyFlag) => {
    emptyFlag = emptyFlag || true;
    const row = document.createElement('tr');

    addRowCell(row, rowData.RIC || '');
    addRowCell(row, rowData.Description || '');
    addRowCell(row, rowData.bid || '', 'text-right');
    addRowCell(row, rowData.ask || '', 'text-right');

    row.onclick = function () {
        if (emptyFlag) {
            removeChildNodes('methodsList');
        }

        // SOLVED TUTOR_TODO Chapter 2.3 Task 1
        const availableMethods = glue.agm.methods().filter(m =>
            m.objectTypes && m.objectTypes.indexOf('Instrument') !== -1);
        addAvailableMethods(availableMethods, rowData.RIC, rowData.BPOD);

        row.setAttribute('data-toggle', 'modal');
        row.setAttribute('data-target', '#instruments');
    }
    row.setAttribute('id', rowData.RIC);
    table.appendChild(row);
};

const addRowCell = (row, cellData, cssClass) => {
    var cell = document.createElement('td');
    cell.innerText = cellData;

    if (cssClass) {
        cell.className = cssClass;
    }
    row.appendChild(cell);
};

const setupPortfolio = (portfolios) => {
    // Updating table with the new portfolio
    const table = document.getElementById('portfolioTable').getElementsByTagName('tbody')[0];

    // Removing all old data
    removeChildNodes('portfolioTableData');

    portfolios.forEach((item) => {
        addRow(table, item);
    });
};

const removeChildNodes = (elementId) => {
    const methodsList = document.getElementById(elementId);

    while (methodsList && methodsList.firstChild) {
        methodsList.removeChild(methodsList.firstChild);
    }
};

const updateInstruments = (streamData) => {
    const data = JSON.parse(streamData.data.data)[0];
    const symbol = data.name;
    const prices = data.image || data.update;

    if (!symbol || !prices) {
        return
    }

    const bid = prices.BID;
    const ask = prices.ASK;

    const symbolRow = document.getElementById(symbol);

    if (symbolRow !== null) {
        const symbolRows = symbolRow.getElementsByTagName('td');
        symbolRows[2].innerHTML = bid || 0;
        symbolRows[3].innerHTML = ask || 0;
    }
};

const addAvailableMethods = (methods, symbol, bpod) => {
    const methodsList = document.getElementById('methodsList');

    methods.forEach((method) => {
        const button = document.createElement('button');
        button.className = 'btn btn-default';
        button.setAttribute('type', 'button');
        button.setAttribute('data-toggle', 'tooltip');
        button.setAttribute('data-placement', 'bottom');
        button.setAttribute('title', method.displayName || method.name);
        button.textContent = method.displayName || method.name;

        button.onclick = (event) => {

            const options = {
                instrument: {
                    ric: symbol,
                    bpod: bpod
                }
            };

            invokeAgMethodByName(method.name, options);
        }

        methodsList.appendChild(button);
    })

    // Enable tooltip
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
};

const invokeAgMethodByName = (methodName, params) => {

    // SOLVED TUTOR_TODO 2.3 Task 2
    glue.agm.invoke(methodName, params);

};

const displayResult = (result) => {
    removeChildNodes('resultInstrumentTbl');

    const resultInstrumentTbl = document.getElementById('resultInstrumentTbl');

    result.forEach((item) => {
        addTickerRow(resultInstrumentTbl, item);
    });

    $('#searchResult').modal('show');
};

const addTickerRow = (table, item) => {

    const row = document.createElement('tr');
    const portfolioTableDataTbl = document.getElementById('portfolioTableData');

    addRowCell(row, item.RIC || '');
    addRowCell(row, item.Description || '');

    row.onclick = () => {
        addRow(portfolioTableDataTbl, item);
        $('#searchResult').modal('hide');
    }

    table.appendChild(row);

    subscribeBySymbol(item.RIC, updateInstruments);
};

const getCurrentPortfolio = () => {
    const portfolio = [];
    const portfolioTableRows = document.querySelectorAll('#portfolioTableData tr');

    portfolioTableRows.forEach((row) => {
        const symbol = {};
        const tds = row.childNodes;

        tds.forEach((td, index) => {
            switch (index) {
                case 0:
                    symbol.ric = td.textContent;
                    break;
                case 1:
                    symbol.description = td.textContent;
                    break;
                case 2:
                    symbol.bid = td.textContent;
                    break;
                case 3:
                    symbol.ask = td.textContent;
                    break;
            }
        })
        portfolio.push(symbol);
    });

    return portfolio;
};

const setUpStreamIndicator = () => {

    const toggleStreamAvailable = (available) => {
        toggleStatusLabel('priceSpan', 'Price feed is', available);
    };

    glue.agm.methodAdded((method) => {
        if (method.name === StreamName && method.supportsStreaming) {
            toggleStreamAvailable(true);
        }
    });

    glue.agm.methodRemoved((method) => {
        if (method.name === StreamName && method.supportsStreaming) {
            toggleStreamAvailable(false);
        }
    });
};

const setUpGlueIndicator = () => {
    const toggleGlueAvailable = (available) => {
        toggleStatusLabel('glueSpan', 'Glue is', available);
    };

    glue.connection.connected(() => {
        toggleGlueAvailable(true);
    });

    glue.connection.disconnected(() => {
        toggleGlueAvailable(false);
    });
};

const toggleStatusLabel = (elementId, text, available) => {
    const span = document.getElementById(elementId);

    if (available) {
        span.classList.remove('label-warning');
        span.classList.add('label-success');
        span.textContent = text + ' available';
    } else {
        span.classList.remove('label-success');
        span.classList.add('label-warning');
        span.textContent = text + ' unavailable';
    }
};

const setUpWindowEventsListeners = () => {

    // SOLVED TUTOR_TODO Chapter 4.2 Task 2
    glue.windows.onWindowRemoved((window) => {
        const parentId = glue.windows.my().context.myWinId;
        if (window.id === parentId) {
            glue.windows.my().close();
        }
    });

};

const setUpTabControls = () => {

    // SOLVED TUTOR_TODO Chapter 4.4 Task 5
    if (glue.windows.my().mode !== 'tab') {
        return;
    }

    // SOLVED TUTOR_TODO Chapter 4.4 Task 6
    const gatherTab = {
        buttonId: 'gatherTabs',
        tooltip: 'Gather all tabs',
        order: 0,
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAIAAAAB6CAYAAAB3N1u0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuOWwzfk4AAAOlSURBVHhe7d1NaxNRFMbxfpoL7vyA+QpuXfkKVRdKdSWodKMg7tyIUIQ2xdF2TK2TmdS+kFLP5J5FkKo3sXNy5zzPD4YsPWfu35dpY7pm5eLiIhRF8XQ4HG4iX/t7ew/ae6G3xb92WbkGP4+OjuSVooHeHt9k0XB+fn4n7kxz/AcgS4azs7NHcV/6je8AZMFwfHz8LO5Kl/AbgCwXJpPJq7gn/YHPAGSxMB6P38Ud6S/8BSBLhaqqPsb96B98BSALtb/zv8bdKIGPAGSR2TO+POLXs7Wu0Liqdna2t9/05arr+ruOnqL/AcgS7eHfnq3TjV7dpHK/vK9zp+h3ALJAmE6nD+MunWEAOZLhw8nJyUbco1MMIDcyeJC/71/EHTrHAHIiQwf5h87bOL8JBpALGbh9xv8QZzfDAHIgw7bP+LtxblMMYJVkyNkzftM0P2Yj22MAqyIDdv2Mn4IBrIIM1z7jr8c5V4oBWJPBwunp6ZM448oxAEsyVPuM/zzOlwUGYEUGap/xX8fZssEALMgwYVxV7+NcWWEAFuTwt3Wo3DAACzpQjhiABR0oRwzAgg6UIwZgQQfKEQOwoAPliAFY0IFyxAAs6EA5YgAWdKAcMQALOlCOGIAFHSgrk6ap5KVXn6KBEMAtuQZGV+8+QmU0Gt2VuVP1MoBe/ZFsTe7P7C10iVc+gcswqRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRiAR3q4KRjAnIODg2uHh4c3r/KaTCY35D7bfp8gnm0SBjBnNBp19d/nbe+z/qIpGMAcBgCOAYBjAOAYADgGAI4BgGMA4BgAOAYAjgGAYwDgGAA4BgCOAYBjAOAYADgGAI4BgGMA4BgAOAYAjgGAYwDgGEBmZL5FPqXrv6+maTbltQuWH8c3cBGAzNb+bONPcUxahJcA2pppCQwAHAMAxwDAMQBwDAAcAwDHAMAxAHAMABwDAMcAwDEAcAwAHAMAxwDAMQBwDACclwBCXdf7cUxahIsAWjIf3xS6xOUmAGt8Wzg4BgCOAYBjAOAYADgGAI4BgGMA4BgAOAYAjgGAYwDgGAA4BgAOMQDT71MbXwv/yHbEANz6Vpb39HYkYwCOFJ+LDb0dyRiAIwwAHAMAxwDAMQBwDAAcAwD3pSge6+1I5imAy74yhnYt/JXAra2t67vD3ZdXeZVlub7MLMtbW/sFpubVd+W6GFMAAAAASUVORK5CYII='
    };

    const extractTab = {
        buttonId: 'extractTabs',
        tooltip: 'Extract all tabs',
        order: 0,
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAIAAAABjCAYAAABT7gjnAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjM2NDE2QTIxQTkyODExRTY4QUY2RTYzRjNEM0ZFRTJBIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjM2NDE2QTIyQTkyODExRTY4QUY2RTYzRjNEM0ZFRTJBIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MzY0MTZBMUZBOTI4MTFFNjhBRjZFNjNGM0QzRkVFMkEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MzY0MTZBMjBBOTI4MTFFNjhBRjZFNjNGM0QzRkVFMkEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7pl9TZAAAEm0lEQVR42uydW08aQRiGnXHDIRViaClNuCgJralpjIXEi/4B/7fXpmurpiSgiRdthdBKcQ2nwk4HgxWJWA6z7Hwz73vljbvMvM93GlaXCSHWIOW621Sm+wfl8CoA9++jSozBAACQEQAAIAAA1kMgAAAkAAAkAAAUekkAAJZnAwBgOQQAwPKSAAAszwYAwHIIAIDlJQEAWJ4NAIDlEDiTN/E8r3RxcdHpdrtRnQC5urqq7e/vf5Q/RgGBuucM2N1X19L4r61WK5/JZCK6rVqa39/Y2PgeiURyJFwSwmdSAd9GyfVvI7xer7uJRGJbR/Nd1/2eSqX6VMynVhLYYDD4xTlP6bjCk5OTo52dnSI1U4ZPBK0gAyjJBkxo+lBgrVY7khmpqFu0jfZrxf4GB4F2APi+v9br9c5jsdgbHczW0WmVEGg1BjYajb7c81oI5ouR3/6D3aRl/r91kARAjp7tzc3N9vr6+qvVNuz3phM0fOkGUQsAzs/Pb3K53DDdJlcYJcIw0xeCIHQAyuWyl8/nhwdSz3RLj4ZAILRtAmXab8nIH0IYpzAzExfTCoBqtfpHjnk9mYE3YHx4EIQCwHDUk/rJOU/D/HBBcOb9zWazOXAc52yZu8fj8ecBmi9G8ztsfjo42EIAdDqdgUzd73TufBncnxkCbtiCoDn3jMN8u8VhvoVhf9/3ky8BMH+BPRv1SIx6BoD5CrI+h/l2zv+UAYD589X7Jx8k5YQXBM0S8uy2z5t6LuJQ8x9nPMulfMoZAJGvIOWTBQCpX03Kp1oCQkv9I+7E2AazWWAN6fuIue/pEIn+tSD3887kCdPYyPBFLulTMJ8KAMqjfyJCyX55OLaOhRdgzV8Hj7cQY3WS9Egxb72nCIBQESVjYU7e9GVTvjUZYMx4borp84541HuApaJ/ZLyJI55ScQK0L5IaTTwuDGRNumaARTt/U8+JA1sXxybZU++NA2BVm0R1xKNaAsSs5pvY6K0aaE418k0zP6xsxjXciFnMR8o3FID/dv/Lnn2jgaVfAmC+qQDMcPiDI13DpwBmQ+Tr1MByzTZmWrSYlPa1WotOAIgnmj6kfEtKgJGpX+czC90zgAmpX+s1aAPAIwMAIxzxjMoaHA03DY2erVOAiSMfAIAAwCwtQKFQ6CL6Z9LAOABkA9g8ODjowfyn1ev1LlzXrRoHgOz/oslkMgqLp2v4XqdIJPI6m82+MLEEDP9ZNACYouPj48/pdLpg9BgIPaquTPn1YrGYNf4cAHoo3/drl5eXIkjzMQZqKs/zTjnnL2W9D7wsAgDNVC6XPyUSife2nQNAcr4/PDysbG1trfRdiegBNJAQ4nelUrnZ29tb+bsSAUDI6nQ6ZxKApIz8UA7BAEDIaT8Wi4VahtEDhDzthf0BAIDlAgAAAAIAEACA7NTcY2Amk4mUSqUGtk6Jbra3tzdJATBU2B8aQgmAAAAEACAAAAEAq6T6zTkAgJiur687AMBieZ73TeX1GN7GRUv9fv+H4zhZlRkAf45FRF+kVJqPEkBIruue7u7uflB9XTZRAVAONFS73T6Lx+Nvg7j2XwEGACbouxHl2VRVAAAAAElFTkSuQmCC'
    }

    glue.windows.my().onWindowAttached((win) => {
        glue.windows.my().addFrameButton(extractTab);
        glue.windows.my().removeFrameButton('gatherTabs');
    });

    glue.windows.my().onAttached((win) => {
        glue.windows.my().addFrameButton(extractTab);
        glue.windows.my().removeFrameButton('gatherTabs');
    });

    glue.windows.my().onDetached((win) => {
        glue.windows.my().addFrameButton(gatherTab);
        glue.windows.my().removeFrameButton('extractTabs');
    });

    glue.windows.my().onWindowDetached((win) => {
        const tabsLen = glue.windows.my().tabs.length;
        console.log(tabsLen);
        if (tabsLen >= 2) {
            glue.windows.my().addFrameButton(extractTab);
            glue.windows.my().removeFrameButton('gatherTabs');
        } else {
            console.log('Alone');
            glue.windows.my().addFrameButton(gatherTab);
            glue.windows.my().removeFrameButton('extractTabs');
        }
    });

    // SOLVED TUTOR_TODO 4.4 Task 7
    glue.windows.my().onFrameButtonClicked((buttonInfo) => {
        const tabs = glue.windows.my().tabs;
        const clientWindowId = glue.windows.my().context.myWinId;
        const clientsWindow = glue.windows.findById(clientWindowId);

        if (buttonInfo.buttonId === 'extractTabs') {
            tabs.forEach((tab) => {
                detachedTabs.push(tab.id);
                tab.detachTab();
            });
            clientsWindow.updateContext({
                detached: detachedTabs
            });
        } else {
            const firstDetachedId = clientsWindow.context.detached[0];
            const firstTab = glue.windows.findById(firstDetachedId);
            const allDetached = clientsWindow.context.detached;
            firstTab.snap(clientsWindow, 'right', () => {
                const remainingDetachedIds = allDetached.slice(1);
                remainingDetachedIds.forEach((id) => {
                    const tab = glue.windows.findById(id);
                    firstTab.attachTab(tab);
                });
            });
        }
    });

    // SOLVED TUTOR_TODO Chapter 4.4 Task 8
    if (glue.windows.my().tabs.length >= 2) {
        console.log('asdasdasd');
        glue.windows.my().addFrameButton(extractTab);
        glue.windows.my().removeFrameButton('gatherTabs');
    }

};

const search = (event) => {
    event.preventDefault();
    var searchValue = document.getElementById('ticker').value;

    // SOLVED TUTOR_TODO Chapter 6 Task 3
    _query.search(searchValue);
};

const sendPortfolioAsEmailClicked = (event) => {
    event.preventDefault();

    const sendPortfolioAsEmail = (client, portfolio) => {

        const getEmailContent = (client, portfolio) => {

            const props = ['ric', 'description', 'bid', 'ask']

            const csv = props.join(", ") + "\n" +
                portfolio.map((row) => {
                    return props.map((prop, index) => {
                        let value = row[prop];

                        if (index === 1) {
                            value = '"' + value + '"'
                        }

                        return value;
                    }).join(", ")
                }).join("\n");

            const html = "<html>\n<body>\n<table>\n<tr><th>" + props.join("</th><th>") + "</th></tr>" +
                portfolio.map((row) => {
                    return "<tr><td>" + props.map((prop) => {
                        const value = row[prop];
                        return value;
                    }).join("</td><td>") + "</td></tr>"
                }).join("\n") + "\n</table>\n</body>\</html>\n";

            const fileName = 'client-' + client.pId + '-portfolio.csv';

            const file = {
                fileName: fileName,
                data: csv,
            };

            const newEmail = {
                to: 'john.doe@domain.com',
                subject: 'Hey John, look at ' + client.name + '\'s portfolio',
                bodyHtml: html,
                attachments: [file]
            };

            return newEmail;
        };

        const content = getEmailContent(client, portfolio);

        // SOLVED TUTOR_TODO Chapter 8 Task 5
        outlook.newEmail(content);
    }

    var portfolio = getCurrentPortfolio();

    sendPortfolioAsEmail(partyObj, portfolio);
};

const sendPortfolioToExcelClicked = (event) => {
    event.preventDefault();

    const sendPortfolioToExcel = (client, portfolio) => {

        const fields = ['ric', 'description', 'bid', 'ask'];

        const config = {
            columnConfig: [{
                fieldName: 'ric',
                header: 'RIC'
            }, {
                fieldName: 'description',
                header: 'Description'
            }, {
                fieldName: 'bid',
                header: 'Bid Price'
            }, {
                fieldName: 'ask',
                header: 'Ask Price'
            }],
            data: portfolio,
            options: {
                worksheet: client.name,
                workbook: 'ExportedPortfolios'
            }
        }

        const loadPortfolioFromExcel = (portfolio) => {

            unsubscribeSymbolPrices();

            removeChildNodes('portfolioTableData');
            const table = document.getElementById('portfolioTable').getElementsByTagName('tbody')[0];

            portfolio.forEach((item) => {
                item.RIC = item.ric;
                item.Description = item.description;
                addRow(table, item);
            })

            subscribeSymbolPrices();
        };

        // SOLVED TUTOR_TODO Chapter 9 Task 3
        excel.openSheet(config)
            .then((sheet) => {
                sheet.onChanged((newPortfolio) => {
                    loadPortfolioFromExcel(newPortfolio);
                })
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const portfolio = getCurrentPortfolio();

    sendPortfolioToExcel(partyObj, portfolio);
};
