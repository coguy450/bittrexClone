'use strict'

const url = function () {
  return `${this.api.launchUrl}/provider-search`
}

const elements = {
  pageIdentifier: '#provider-search',
  doctorContainer: '.search-option-container:nth-child(1)',
  specialtyContainer: '.search-option-container:nth-child(2)',
  pharmacyContainer: '.search-option-container:nth-child(3)',
  changeZipButton: '#zipCode-change',
  zipEntryField: '#zipCode-input',
  updateZipButton: '.zipCodeUpdateContainer > .zipSearchItem > .zipCodeUpdateButton',
  currentZip: '.currentZipCode',
  submitButtonProvider: '#submit-button-provider',
  submitButtonPharmacy: '#submit-button-pharmacy',
  zipCodeInputProvider: '#input-location-value-provider',
  zipCodeInputPharmacy: '#input-location-value-pharmacy',
  planSelectionDropdown: '#plan-selection-dropdown',
  subpageHeader: '.subpage-header',
  planCoverageDates: '.plan-coverage-dates',
  loadGoogleMaps: '#load-google-maps',
  pcpReminderLink: '#pcp-reminder-link',
  pcpReminderModal: '#why-choose-pcp',
  pcpReminderExplanation: '.pcp-reminder-explanation',
  pcpReminderCallToAction: '.pcp-reminder-call-to-action',
  pcpReminderDisclaimer: '.pcp-reminder-disclaimer',
  pcpSearchContainer: '#search-form > div.pcp-selection-container.row',
  pcpSearchCheckbox: 'input[type=checkbox]:not(:checked)',
  pcpSearchCheckboxClicked: 'input[type=checkbox]:checked',
  costTransparency: '.cost-transparency',
  costTransparencyHeading: '.cost-transparency-heading',
  costTransparencyExplanation: '.cost-transparency-explanation',
  costTransparencyDislaimerTooltip: '.cost-transparency-disclaimer mc-tt',
  commonSearchesContainer: '#common-searches',
  commonSearchesFacilityPharmacyItem: '#home-facility-type-RX,PROV',
  specialtyPCPLink: '#home-specialty-6',
  pharymacySearches: '#pharmacy-searches',
  questionsLink: '#questions-link',
  questionsModal: '#questions'
}

const sections = {
}

const commands = [{
  waitUntilLoaded: function () {
    this.waitForElementPresent('@pageIdentifier', 30000)
    return this.api
  },
  load: function (opts) {
    this.navigate(`${this.api.launch_url}?multipath=${opts.multipath}`)
    return this.api
  },
  loadWithPlan: function (opts) {
    const {zipCode, searchType, networkTier, gender, distance, planId, multipath, isPcpSearch, provider, specialty} = opts
    const searchResultsUrl = `${this.url()}/results?zipCode=${zipCode}&provider=${provider}&searchType=${searchType}&networkTier=${networkTier}&gender=${gender}&distance=${distance}&planId=${planId}&isPcpSearch=${isPcpSearch}&multipath=${multipath}`
    this.navigate(searchResultsUrl)
  },
  loadWithSpecialty: function (opts) {
    const {zipCode, searchType, networkTier, gender, distance, planId, multipath, isPcpSearch, provider, specialty} = opts
    const searchResultsUrl = `${this.url()}/results?zipCode=${zipCode}&specialty=${specialty}&searchType=${searchType}&networkTier=${networkTier}&gender=${gender}&distance=${distance}&planId=${planId}&multipath=${multipath}`
    this.navigate(searchResultsUrl)
  },
  search: function (typeOfSearch, searchTerm, zipCode, pcpSelection) {
    this.clickSearchContainer(typeOfSearch)
    this.setPcpSelection(pcpSelection)
    this.setSearchTerm(typeOfSearch, searchTerm)
    this.setSearchBarZipCode(typeOfSearch, zipCode)
    this.waitForAngularAndJqueryRequests()
    this.clickSearchButton(typeOfSearch)
    return this.api
  },
  setPcpSelection: function (pcpSelection) {
    if (pcpSelection) {
      this.waitForElementPresent('@pcpSearchCheckbox')
      this.click('@pcpSearchCheckbox')
      this.waitForElementPresent('@pcpSearchCheckboxClicked')
    }
    return this.api
  },
  clickSearchContainer: function (typeOfSearch) {
    if (typeOfSearch === 'provider') {
      this.waitForElementPresent('@doctorContainer')
      this.click('@doctorContainer')
    } else if (typeOfSearch === 'pharmacy') {
      this.waitForElementPresent('@pharmacyContainer')
      this.click('@pharmacyContainer')
    }
    this.api.pause(500)
    return this.api
  },
  setSearchTerm: function (typeOfSearch, searchTerm) {
    if (typeOfSearch === 'provider') {
      this.waitForElementPresent('@submitButtonProvider')
      this.clearValue('#input-keyword-value-provider')
      this.setValue('#input-keyword-value-provider', searchTerm)
    } else if (typeOfSearch === 'pharmacy') {
      this.waitForElementPresent('@submitButtonPharmacy')
      this.clearValue('#input-keyword-value-pharmacy')
      this.setValue('#input-keyword-value-pharmacy', searchTerm)
    }
    return this.api
  },
  setSearchBarZipCode: function (typeOfSearch, zipCode) {
    if (typeOfSearch === 'provider') {
      this.waitForElementPresent('@zipCodeInputProvider')
      this.clearValue('@zipCodeInputProvider')
      this.setValue('@zipCodeInputProvider', zipCode)
    } else if (typeOfSearch === 'pharmacy') {
      this.waitForElementPresent('@submitButtonPharmacy')
      this.setValue('#input-keyword-value-pharmacy', zipCode)
    }
    return this.api
  },
  clickSpecialtyContainer: function () {
    this.waitForElementPresent('@specialtyContainer')
    this.click('@specialtyContainer')
    return this.api
  },
  clickChangeZipButton: function () {
    this.waitForElementPresent('@changeZipButton')
    this.click('@changeZipButton')
    return this.api
  },
  enterNewZipCodeInField: function (zipCode) {
    this.waitForElementPresent('@zipEntryField')
    this.setValue('@zipEntryField', zipCode)
    return this.api
  },
  clickUpdateZipButton: function () {
    this.waitForElementPresent('@updateZipButton')
    this.click('@updateZipButton')
    return this.api
  },
  expectZipCodeFieldToHaveZipValue: function (zipCode) {
    this.waitForElementPresent('@currentZip')
    this.expect.element('.currentZipCode').text.to.contain(zipCode)
    return this.api
  },
  expectSearchToHaveZipValue: function (typeOfSearch, zipCode) {
    this.waitForElementPresent('#input-location-value-provider')
    this.expect.element('#input-location-value-provider').value.to.contain(zipCode)
    return this.api
  },
  expectPcpReminder: function (isRequired, isPublicSearch = true, isMedicare = false) {
    this.waitForElementVisible('@pcpReminderLink')
    this.click('@pcpReminderLink')
    this.waitForElementVisible('@pcpReminderModal')
    this.expect.element('@pcpReminderExplanation').text.to.contain('Your PCP is more than someone you call when you\'re sick')
    if (isPublicSearch) {
      this.expect.element('@pcpReminderExplanation').text.to.contain('To assign your PCP during enrollment')
    } else {
      this.expect.element('@pcpReminderExplanation').text.to.contain('To choose or update your PCP')
      if (isRequired) {
        this.expect.element('@pcpReminderCallToAction').text.to.contain('Just call us at')
      } else {
        this.expect.element('@pcpReminderCallToAction').text.to.contain('Even though you don\’t need a PCP')
      }
    }
    if (!isMedicare) {
      if (isRequired) {
        this.expect.element('@pcpReminderDisclaimer').text.to.contain('Since you need a PCP under your plan')
      } else {
        this.expect.element('@pcpReminderDisclaimer').text.to.contain('Don\'t have a PCP yet?')
      }
    }
  },
  expectQuestionsModal: function () {
    this.waitForElementVisible('@questionsLink')
    this.click('@questionsLink')
    this.waitForElementVisible('@questionsModal')
  },
  expectCostTransparencyReminder: function () {
    this.expect.element('@costTransparency').to.be.visible
    this.expect.element('@costTransparencyHeading').text.to.contain('Want to know how much a service or procedure costs?')
    this.expect.element('@costTransparencyExplanation').text.to.contain('Contact us to get an estimate for some common covered services and procedures, such as maternity, knee surgery and colonoscopy.')
  },
  expectCostTransparencyReminderMedicare: function () {
    this.expect.element('@costTransparencyDislaimerTooltip').to.not.be.present
    this.expect.element('@costTransparencyHeading').text.to.contain('Want to know how much a service or procedure costs?')
    this.expect.element('@costTransparencyExplanation').text.to.contain('Contact us to get an estimate for some common covered services and procedures.')
  },
  clickSearchButton: function (typeOfSearch) {
    if (typeOfSearch === 'provider') {
      this.click('@submitButtonProvider')
    } else if (typeOfSearch === 'pharmacy') {
      this.click('@submitButtonPharmacy')
    }
    return this.api
  },
  expectPageIdentifierNotPresent: function () {
    this.waitForElementNotPresent('@pageIdentifier')
    return this.api
  },
  validatePlanDropdownExists: function () {
    this.waitForElementPresent('@planSelectionDropdown')
    this.expect.element('@planSelectionDropdown').to.be.visible
    return this.api
  },
  validatePlanSwitchingBehaviour: function () {
    this.selectPlan('Pending Plan (2017)')
    this.expect.element('@planSelectionDropdown').text.to.contain('Pending Plan')
    this.expect.element('@subpageHeader').text.to.contain('2017')
    this.expect.element('@planCoverageDates').text.to.contain('Pending Plan: Coverage Begins')
    return this.api
  },
  selectPlan: function (planDescription) {
    this.waitForElementVisible('@planSelectionDropdown', 30000)
      .click('@planSelectionDropdown')
      .click(`option[label="${planDescription}"]`)
    return this.api
  },
  validatePcpSearchContainer: function () {
    this.expect.element('@pcpSearchContainer').to.be.present
    this.assert.elementPresent('@pcpSearchContainer')
    this.assert.elementPresent('@pcpSearchCheckbox')
    return this.api
  },
  clickPcpSpecialty: function () {
    this.waitForElementPresent('@specialtyPCPLink')
    this.click('@specialtyPCPLink')
    return this.api
  },
  validatePharmacyOptionAbsentFromCommonSearches: function () {
    this.assert.elementPresent('@commonSearchesContainer')
    this.expect.element('@commonSearchesFacilityPharmacyItem').to.not.be.present
    return this.api
  },
  validatePharmacyFindMedications: function () {
    this.assert.elementPresent('@pharymacySearches')
    this.expect.element('@pharymacySearches').to.be.present
    return this.api
  }
}]

module.exports = {url, commands, elements, sections}
