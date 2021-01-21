// timeline/ timepicker control
// version 0.7.4
// ToSe 

//////////////////////////////////////////////////////////////////////////////////////

Vue.component('time-scale',{
  template: '<div @mouseup="mouseLeftUp()" style="height: 20px; padding: 10px;; padding-right: 30px;"><div class="day"><div class="scale"><div class="unit" v-for="(i,index) in _range()" @mousedown="mouseLeftDown(i)" @mouseover="mouseMove(i)" :style="{background: scaleColors[initValue[indexLine].value[i]], width: scaleSegmentWidth}"><div class="one" :class="{lineR: (i+1) % 4 == 0, lineL: i == 0}"></div><div class="two" :class="{lineR: (i+1) % 2 == 0, lineL: i == 0}"></div><div class="three" :class="{lineL: i == 0}"></div><div class="three" :class="{lineL: i == 1}" :style="{background: _eventBackground(i)}"></div></div></div></div></div>',
  data: function() {
    return {
      mouseLeftPressed: false
    }   
  },
  props: {
    indexLine: 0,
    zoomFactor: { type: Number },
    currTime: { type: Number },
    currSwitchstate: 0,
    eventTrigger: {
      type: Boolean,
      default: true,
    },
    scaleColors: {
      type: Array,
      default: function() { return [] }
    },
    initValue: {
      type: Object,
      default: function() { return {} }
    }
  },
  computed: {
    scaleSegmentWidth: function() {
      return ('calc(100% / 96 * ' + this.zoomFactor + ')')
    }
  },
  methods: {
     mouseMove(index) {
      if (this.mouseLeftPressed) {
        let setState = (this.eventTrigger && (this.currSwitchstate == 0)) ? (-1) : this.currSwitchstate;
        Vue.set(this.initValue[this.indexLine]['value'], index, setState);
      }
    },
    mouseLeftDown(index) {
      this.mouseLeftPressed = true;
      let setState = (this.eventTrigger && (this.currSwitchstate == 0)) ? (-1) : this.currSwitchstate;
      Vue.set(this.initValue[this.indexLine]['value'], index, setState);
    },
    mouseLeftUp() {
        this.mouseLeftPressed = false;
    },
    _eventBackground: function(index) {
      if (this.initValue[this.indexLine].value[index] == (-1)) {
        return (this.scaleColors[0])
      }
    },
    _range : function() {
      let start = (this.currTime - (24 / this.zoomFactor/2))
      if (start < 0) start = 0
      if ((start + (24 / this.zoomFactor)) > 24) start = (24 - (24 / this.zoomFactor))
      start = start * 4
      let diff = 96 / this.zoomFactor
      return Array(diff).fill().map((_, idx) => start + idx)
    }
  }
})

Vue.component('tl-inactive',{
  template:'<div id="overlayDisable"><div id="overlayDisableContent"><div>{{line1}}</div><div>{{line2}}: {{lastState}}</div><div id="reactivate" class="activation" @click="reactivate"><div>{{line3}}</div></div></div></div>',
  data: function() {
    return {
      line1: '',
      line2: '',
      line3: ''
    }
  },
  props: {
    lang: {
      type: String,
      default: 'en'
    },
    lastState: String
  },
  created: function() {
    this.line1 = prefs.languages[this.lang].inactive.line1;
    this.line2 = prefs.languages[this.lang].inactive.line2;
    this.line3 = prefs.languages[this.lang].inactive.line3;
  },
  methods: {
    reactivate() {
      this.$emit('click')
    }
  }
})

new Vue({
  el: '#app',
  data: () => ({
    device: '',               // variables for presentation zoom slider and slider for shift timeintervall in sitemap
    orientation: 'portrait',  //
    zoomVisible: false,       //
    zoomForced: 'auto',       // 
    zoomFactor: 0,            //
    currTime:  12,            //
    initValue: {},            // buffer for data structure
    numberScales: 0,
    yAxisLabel: [],
    timeScale: ['00','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24'],
    urlParamItemName: '',
    secPrompt: false,         // security prompt befor switch points will changed
    ip: '',
    switchStates: [],
    currSwitchstate: 0,
    scaleValueColors: [],
    stateParam: ',',
    statesChanged: 0,         // 0 .. not changed, 1 .. changed, 2 .. error
    apiRequestBody: '',
    eventTrigger: false,
    darkMode: false,
    currLang: 'en',           // default language: en
    line4: '',
    tl_inactive: false,       // timeline inactive = true
    tl_inactive_lastState: '',// state befor timeline inactivated
    deactivation: false,      // switch for activation/deactivation visible
    debounceTimer: null       // debonce timer for activation/deactivation
  }),
  computed: {
    zoomFactor1: function() {
      return (this.zoomFactor == 0) ? 1 : this.zoomFactor * 3
    },
    currTime1: function() {
      return this.currTime * 1
    },
    currTimeScale: function() {
      let startIndex = this.currTime - (24 /this.zoomFactor1 / 2)
      if (startIndex < 0) startIndex = 0
      if ((startIndex + (24 / this.zoomFactor1)) > 24) startIndex = (24 - (24 / this.zoomFactor1))
      let endIndex = startIndex + (24 /this.zoomFactor1)
      return this.timeScale.filter((val,index) => ((this.zoomFactor1 == 1) && (index % 2 == 0)) || ((this.zoomFactor1 != 1) && ((index >= startIndex) && (index <= endIndex))))
    },
    xAxisTimeScale: function() {
      let calculatedLabel = []
      if ((this.device == 'Mobile') && (this.orientation == 'portrait')) {
        calculatedLabel = this.timeScale.filter((val,index) => (index % 4 == 0))
      } else {
        calculatedLabel = this.timeScale.filter((val,index) => (index % 2 == 0))
      }
      return calculatedLabel;
    }
  },
  created() {
    let urlParams = new URLSearchParams(window.location.search);
    this.urlParamItemName = urlParams.get('transferItem');
    let yAxis = (urlParams.get('yAxisLabel')).split(',');
    let openHAB_ip = urlParams.get('ip');
    this.stateParam = urlParams.get('states');
    let colorSet =urlParams.get('colorset');
    this.deactivation = ((urlParams.get('deactivation') != null) && (urlParams.get('deactivation') == 'true')) ? true : false;

    // set language then selected else default: en
    if (urlParams.get('lang') != null) this.currLang = urlParams.get('lang');
    this.currLang = (prefs.languages[this.currLang] == undefined) ? 'en' : this.currLang;
    // select correct language for UI
    this.line4 = prefs.languages[this.currLang].inactive.line4;

    // set default for states values OFF/ON
    if (this.stateParam == null) this.stateParam = 'OFF,ON';
    this.switchStates = this.stateParam.split(',');
    // when more then five states passed -> cancel from position six
    if (this.switchStates.length > 5) this.switchStates.splice(6, this.switchStates.length - 6);

    // check user defined colorset or select one of the predefined colorsets or set user defined colors
    // select default colorset
    this.scaleValueColors = prefs.colorsets["1"]

    // check if url parameter used
    if (colorSet != null) {
      let csArray = colorSet.split(',');
      // check if selected an predefined colorset (lenght = 1) or userdefined colorset (lenght > 1)
      if (csArray.length > 1) {
        // check is event inactive then set #000 as dummy
        if (urlParams.get('event') != 'yes') {
          csArray.unshift('#000')
        }
        csArray.forEach( (color, index) => {
          if (index < this.scaleValueColors.length) {
            this.scaleValueColors[index] = '#' + color;
          }
        })
      } else {
        // check is selected colorset not empty and exist key in prefs
        if (csArray[0] != "" && (csArray[0] in prefs.colorsets)) {
          this.scaleValueColors = prefs.colorsets[csArray[0]]
        }
      }
    }

    // show event trigger
    if (urlParams.get('event') == 'yes') {
      this.eventTrigger = true;
      // add manuell as state; note: there are max 5 user defined states
      this.switchStates.unshift('manuell');
    } else {
      this.scaleValueColors.shift();                    // event mode no -> remove the predefined color for manual mode
    }
    
    // check dark mode
    if (urlParams.get('dark') == 'yes') this.darkMode = true;
    this.switchStatesCount = this.switchStates.length;
    this.ip = 'http://' + openHAB_ip + '/rest/items/';
    // check zoom parameter
    let zoom = urlParams.get('zoom');
    if (zoom == 'no') this.zoomForced = 'no';
    if (zoom == 'force') this.zoomForced = 'force';

    // set label for y axis and note the language select; default is german
    let yLabel = this._selectLang(this.currLang);
    if (yAxis.includes('17')) this.yAxisLabel.push({'key' : '17', 'label' : yLabel[0]});
    if (yAxis.includes('15')) this.yAxisLabel.push({'key' : '15', 'label' : yLabel[1]});
    if (yAxis.includes('1')) this.yAxisLabel.push({'key' : '1', 'label' : yLabel[2]});
    if (yAxis.includes('2')) this.yAxisLabel.push({'key' : '2', 'label' : yLabel[3]});
    if (yAxis.includes('3')) this.yAxisLabel.push({'key' : '3', 'label' : yLabel[4]});
    if (yAxis.includes('4')) this.yAxisLabel.push({'key' : '4', 'label' : yLabel[5]});
    if (yAxis.includes('5')) this.yAxisLabel.push({'key' : '5', 'label' : yLabel[6]});
    if (yAxis.includes('6')) this.yAxisLabel.push({'key' : '6', 'label' : yLabel[7]});
    if (yAxis.includes('7')) this.yAxisLabel.push({'key' : '7', 'label' : yLabel[8]});
    if (yAxis.includes('67')) this.yAxisLabel.push({'key' : '67', 'label' : yLabel[9]});
    this.numberScales = this.yAxisLabel.length;

    // init for initValue, because the delay from promise throws error while rendering
    for ( let i = 1; i < (this.numberScales + 1); i++) {
      Vue.set(this.initValue,i,{'key' : this.yAxisLabel[i - 1].key, 'value' : this._initArray(96) });
    }
    Vue.set(this.initValue,99,this.switchStates.toString())
    Vue.set(this.initValue,100,{
      'event' : this.eventTrigger,
      'lastItemState' : (-1),
      'inactive' : false
    })

    this.$http.get(this.ip + this.urlParamItemName +'/state').then(response => {
      this.apiRequestBody = response.body;

      if ((typeof this.apiRequestBody === 'object') && (response.status === 200)) {
        // check inital call
        // check integrity switchStates
        if (this.apiRequestBody[99] !== undefined) {
          if (this.apiRequestBody[99] !== null) {
            let storedStates = this.apiRequestBody[99].split(',');

            if (storedStates.length == this.switchStatesCount) {
              for (let i=0; i < this.switchStatesCount; i++) {
                if (this.switchStates[i] != storedStates[i]) this.statesChanged = 1;
              };
            } else {
              this.statesChanged = 1;
            }
          } else {
            if (this.stateParam !== null) {
              if (!((this.stateParam.includes('ON')) && (this.stateParam.includes('OFF')))) {
                this.statesChanged = 1;
              }
            }
          }
        }
        if (this.apiRequestBody[100] !== null) {
          if (this.apiRequestBody[100].event != this.eventTrigger) this.statesChanged = 1;                                    // check integrity of event parameter   
          if (this.apiRequestBody[100].inactive == true) {                                                                    // check state of inactive
            this.tl_inactive = true;                                         
            if (this.apiRequestBody[100].lastState != '') this.tl_inactive_lastState = this.apiRequestBody[100].lastState;    // state befor timeline inactivated
          }
        }
        // check integrity of y axis parameter
        let requestKeys = Object.keys(this.apiRequestBody)
        let daySet = 0;
        let dayKeys = [];
        for (let i = 0; i < requestKeys.length; i++) {
          if (this.apiRequestBody[requestKeys[i]].key != undefined) {
            dayKeys.push(this.apiRequestBody[requestKeys[i]].key);
            daySet = ++daySet;
          }
        }
        if (yAxis.length = daySet) {
          for (let i = 0; i < daySet; i++) {
            if (!dayKeys.includes(yAxis[i])) {
              this.statesChanged = 1;
              break;
            };
          }
        } else {
          this.statesChanged = 1;
        }


        if (this.statesChanged == 0) {
          this._initValueArray();
        }
      } else {
        console.log('warn in API call; transfered data is empty or not valid')
      }
    }, response => {
      // error callback
      console.log('error in API request to openHAB')
    });
  },
  mounted() {
    this.$nextTick(function() {
      window.addEventListener('resize', this.screenChanged);
      //Init
      this.screenChanged();
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.screenChanged);
  },
  methods: {
    _initArray(n) {
      var arr = [];
      let defaultState = (this.eventTrigger) ? (-1) : 0; 
      for(let i = 0; i < n; i++) arr.push(defaultState);
      return arr;
    },
    _initValueArray() {
      for ( let i = 1; i < (this.numberScales + 1); i++) {
        // init data set
        Vue.set(this.initValue,i,{
          'key' : this.yAxisLabel[i - 1].key,
          'value' : (typeof this.apiRequestBody[i] !== 'undefined') ? this.apiRequestBody[i].value : this._initArray(96)
        });
      }
    },
    firstInitValueArray() {
      this.statesChanged = 0;
    },
    stateChangedAbort() {
      this.statesChanged = 2;
    },
    // set color is active
    setCurrentSwitchState(key) {
      this.currSwitchstate = key;
    },
    setInterval() {
      this.secPrompt = true;
    },
    saveInterval() {
      this.$http.post(this.ip + this.urlParamItemName,  JSON.stringify(this.initValue), {'headers': {"Accept": "application/json","content-type": "text/plain"}}).then(response => {
        // get status
        console.log(response.status);
        // get status text
        console.log(response.statusText);
      }, response => {
      // error callback
      console.log(response)
      });
      this.secPrompt = false;
    },
    abort() {
      this.secPrompt = false;
    },
    toggleDisable() {
      this.tl_inactive = (this.tl_inactive == true) ? false : true;
      if (this.debounceTimer == null) {
        this.debounceTimer = setTimeout(this._debounceTimerFunc, 2000, this);
      } else {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(this._debounceTimerFunc, 2000, this);
      }
    },
    _debounceTimerFunc(oThis) {
      if (oThis.tl_inactive != oThis.initValue["100"].inactive) {
        oThis.initValue["100"].inactive = oThis.tl_inactive;
        this.saveInterval();
        if (oThis.tl_inactive) {
          this.$http.get(oThis.ip + 'TimelineHelper/state').then(response => {
            if ((typeof response.body === 'object') && (response.status === 200)) {
              if (response.body[oThis.urlParamItemName] != undefined){
                if (response.body[oThis.urlParamItemName]["inactiveLastValue"] != undefined)
                oThis.tl_inactive_lastState = response.body[oThis.urlParamItemName]["inactiveLastValue"];
              };
            } else {
              console.log('item TimelineHelper, data strucktur is not valid')
            }
          }, response => {
            // error callback
            console.log('error in API request to openHAB or item TimelineHelper is not defined or empty')
          });
        }
      }
      oThis.debounceTimer = null;
    },
    _selectLang(lang) {
      return (prefs.languages[lang] == undefined) ? prefs.languages["en"].yLabel : prefs.languages[lang].yLabel
    },
    screenChanged(event) {
      //this.screenWidth = document.documentElement.clientWidth;
      //this.screen Height = document.documentElement.clientWidth;
      
      // recognize device type
      if(navigator.userAgent.match(/mobile/i)) {
        this.device = 'Mobile';
      } else if (navigator.userAgent.match(/iPad|Android|Touch/i)) {
        this.device = 'Tablet';
      } else {
        this.device = 'Desktop';
      }
      // set zoom variables for presentation in sitemap
      this.zoomVisible = ((this.device != 'Desktop') && (this.zoomForced != 'no')) ? true : false;  
      if (this.zoomForced == 'force') this.zoomVisible = true;  

      // recognize device orientation
      if (window.matchMedia("(orientation: portrait)").matches) this.orientation = 'portrait' 
      if (window.matchMedia("(orientation: landscape)").matches) this.orientation = 'landscape' 
    }
  }
})