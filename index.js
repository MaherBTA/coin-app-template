const fs = require('fs')
const path = require('path')
const shardus = require('shardus-enterprise-server-dist')
const crypto = require('shardus-crypto-utils')
crypto('64f152869ca2d473e4ba64ab53f49ccdb2edae22da192c126850970e788af347')

let config = { server: { baseDir: './' } }
if (process.env.BASE_DIR) {
  if (fs.existsSync(path.join(process.env.BASE_DIR, 'config.json'))) {
    config = JSON.parse(fs.readFileSync(path.join(process.env.BASE_DIR, 'config.json')))
  }
  config.server.baseDir = process.env.BASE_DIR
}

const dapp = shardus(config)

/**
 * interface account {
 *   id: string,
 *   hash: string,
 *   timestamp: number,
 *   data: {
 *     balance: number
 *   }
 * }
 *
 * interface accounts {
 *   [id: string]: account
 * }
 */
let accounts = {}
function setAccountData (accountsToAdd = []) {
  for (const account of accountsToAdd) {
    accounts[account.id] = account
  }
}
function getAccountsById (ids = []) {
  const accountsList = []
  for (const id of ids) {
    const account = accounts[id]
    if (typeof account !== 'undefined' && account !== null) {
      accountsList.push(account)
    }
  }
  return accountsList
}
function getAccountsRange (accountStart, accountEnd, tsStart, tsEnd, maxRecords) {
  const accountsArray = Object.values(accounts)
  const matchingAccounts = accountsArray.filter(account => {
    return (account.id >= accountStart || account.id <= accountEnd) &&
           (account.timestamp >= tsStart || account.timestamp <= tsEnd)
  })
  return matchingAccounts.slice(0, maxRecords)
}
function wrapAccountResults (accountsList) {
  const wrappedAccounts = []
  for (const account of accountsList) {
    wrappedAccounts.push({
      accountId: account.id,
      stateId: account.hash,
      data: account.data,
      timestamp: account.timestamp
    })
  }
  return wrappedAccounts
}
function createAccount (obj = {}) {
  const account = Object.assign({
    id: crypto.randomBytes(),
    data: {
      balance: 0
    }
  }, obj)
  account.hash = crypto.hashObj(account.data)
  account.timestamp = Date.now()
  return account
}

dapp.registerExternalPost('inject', async (req, res) => {
  console.log(req.body)
  dapp.put(req, res)
})

dapp.registerExternalGet('account/:id', async (req, res) => {
  const id = req.params['id']
  const account = accounts[id] || null
  res.json({ account })
})

dapp.registerExternalGet('accounts', async (req, res) => {
  res.json({ accounts })
})

/**
 * interface tx {
 *   type: string
 *   from: string,
 *   to: string,
 *   amount: number,
 *   timestamp: number
 * }
 */
dapp.setup({
  validateTransaction (tx) {
    const response = {
      result: 'fail',
      reason: 'Transaction is not valid.'
    }

    // Validate tx here
    if (tx.amount < 0) {
      response.reason = '"amount" must be non-negative.'
      return response
    }
    switch (tx.type) {
      case 'create':
        response.result = 'pass'
        response.reason = 'This transaction is valid!'
        return response
      case 'transfer':
        const from = accounts[tx.from]
        if (typeof from === 'undefined' || from === null) {
          response.reason = '"from" account does not exist.'
          return response
        }
        if (from.data.balance < tx.amount) {
          response.reason = '"from" account does not have sufficient funds.'
          return response
        }
        response.result = 'pass'
        response.reason = 'This transaction is valid!'
        return response
      default:
        response.reason = '"type" must be "create" or "transfer".'
        return response
    }
  },
  validateTxnFields (tx) {
    // Validate tx fields here
    let result = 'pass'
    let reason = ''
    const txnTimestamp = tx.timestamp

    if (typeof tx.type !== 'string') {
      result = 'fail'
      reason = '"type" must be a string.'
      throw new Error(reason)
    }
    if (typeof tx.from !== 'string') {
      result = 'fail'
      reason = '"from" must be a string.'
      throw new Error(reason)
    }
    if (typeof tx.to !== 'string') {
      result = 'fail'
      reason = '"to" must be a string.'
      throw new Error(reason)
    }
    if (typeof tx.amount !== 'number') {
      result = 'fail'
      reason = '"amount" must be a number.'
      throw new Error(reason)
    }
    if (typeof tx.timestamp !== 'number') {
      result = 'fail'
      reason = '"timestamp" must be a number.'
      throw new Error(reason)
    }

    return {
      result,
      reason,
      txnTimestamp
    }
  },
  apply (tx) {
    // Compute some fields required by Shardus
    const txId = crypto.hashObj(tx) // compute from tx
    const txTimestamp = tx.timestamp // get from tx
    console.log('DBG', 'attempting to apply tx', txId, '...')
    // Create an applyResponse which will be used to tell Shardus that the tx has been applied
    const applyResponse = dapp.createApplyResponse(txId, txTimestamp)
    // Apply tx here
    switch (tx.type) {
      case 'create': {
        // Create the to account if it doesn't exist
        let accountCreated = false
        let to = accounts[tx.to]
        if (typeof to === 'undefined' || to === null) {
          to = createAccount({ id: tx.to })
          accounts[tx.to] = to
          accountCreated = true
        }
        // Increment the to accounts balance
        to.data.balance += tx.amount
        // Update accounts meta data fields
        const hashBefore = to.hash
        const hashAfter = crypto.hashObj(to.data)
        to.hash = hashAfter
        to.timestamp = Date.now()
        console.log('DBG', 'applied create tx', txId, accounts[tx.to])
        // Add the right state data to our applyResponse to enable Shardus's data syncing
        dapp.applyResponseAddState(applyResponse, to.data, to.id, txId, txTimestamp, hashBefore, hashAfter, accountCreated)
        break
      }
      case 'transfer': {
        // Get the from account
        const from = accounts[tx.from]
        // Create the to account if it doesn't exist
        let toAccountCreated = false
        let to = accounts[tx.to]
        if (typeof to === 'undefined' || to === null) {
          to = createAccount({ id: tx.to })
          accounts[tx.to] = to
          toAccountCreated = true
        }
        // Decrement the from accounts balance
        from.data.balance -= tx.amount
        const fromHashBefore = from.hash
        const fromHashAfter = crypto.hashObj(from.data)
        from.hash = fromHashAfter
        from.timestamp = Date.now()
        // Increment the to accounts balance
        to.data.balance += tx.amount
        const toHashBefore = to.hash
        const toHashAfter = crypto.hashObj(to.data)
        to.hash = toHashAfter
        to.timestamp = Date.now()
        console.log('DBG', 'applied transfer tx', txId, accounts[tx.from], accounts[tx.to])
        // Add the right state data to our applyResponse to enable Shardus's data syncing
        dapp.applyResponseAddState(applyResponse, from.data, from.id, txId, txTimestamp, fromHashBefore, fromHashAfter, false)
        dapp.applyResponseAddState(applyResponse, to.data, to.id, txId, txTimestamp, toHashBefore, toHashAfter, toAccountCreated)
        break
      }
    }
    return applyResponse
  },
  getKeyFromTransaction (tx) {
    const result = {
      sourceKeys: [],
      targetKeys: [],
      timestamp: tx.timestamp
    }
    switch (tx.type) {
      case 'create':
        result.targetKeys = [tx.to]
        break
      case 'transfer':
        result.targetKeys = [tx.to]
        result.sourceKeys = [tx.from]
        break
    }
    return result
  },
  getStateId (accountAddress, mustExist = true) {
    const account = accounts[accountAddress]
    if ((typeof account === 'undefined' || account === null) && mustExist === true) {
      throw new Error('Could not get stateId for account ' + accountAddress)
    }
    const stateId = account.hash
    return stateId
  },
  getAccountDataByList (ids) {
    const accountsList = getAccountsById(ids)
    const wrappedAccounts = wrapAccountResults(accountsList)
    return wrappedAccounts
  },
  deleteLocalAccountData () {
    accounts = {}
  },
  getAccountData3 (accountStart, accountEnd, tsStart, maxRecords) {
    let tsEnd = Date.now()
    let result = getAccountsRange(accountStart, accountEnd, tsStart, tsEnd, maxRecords)
    let lastUpdateNeeded = false
    let wrappedAccounts2 = []
    let highestTs = 0
    // do we need more updates
    if (result.length === 0) {
      lastUpdateNeeded = true
    } else {
      // see if our newest record is new enough
      highestTs = 0
      for (let account of result) {
        if (account.timestamp > highestTs) {
          highestTs = account.timestamp
        }
      }
      let delta = tsEnd - highestTs
      // if the data we go was close enough to current time then we are done
      // may have to be carefull about how we tune this value relative to the rate that we make this query
      // we should try to make this query more often then the delta.
      console.log('delta ' + delta)
      if (delta < 7000) {
        let tsStart2 = highestTs
        let result2 = getAccountsRange(accountStart, accountEnd, tsStart2, Date.now(), 10000000)
        wrappedAccounts2 = wrapAccountResults(result2)
        lastUpdateNeeded = true
      }
    }
    let wrappedAccounts = wrapAccountResults(result)
    return { wrappedAccounts, lastUpdateNeeded, wrappedAccounts2, highestTs }
  },
  setAccountData (accountRecords) {
    let accountsToAdd = []
    let failedHashes = []
    for (let { accountId, stateId, data: recordData } of accountRecords) {
      let hash = crypto.hashObj(recordData)
      if (stateId === hash) {
        if (recordData.data) recordData.data = JSON.parse(recordData.data)
        accountsToAdd.push(recordData)
        console.log('setAccountData: ' + hash + ' txs: ' + recordData.txs)
      } else {
        console.log('setAccountData hash test failed: setAccountData for ' + accountId)
        console.log('setAccountData hash test failed: details: ' + JSON.stringify({ accountId, hash, stateId, recordData }))
        failedHashes.push(accountId)
      }
    }
    console.log('setAccountData: ' + accountsToAdd.length)
    setAccountData(accountsToAdd)
    return failedHashes
  }
})

dapp.start()
