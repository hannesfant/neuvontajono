'use strict';

import React from 'react';
import {FormattedMessage} from 'react-intl';
import {injectIntl} from 'react-intl';

/********************************************************************
 *  Statistics provides the view for showing the number of participants
 *  and other numerical data as well as the list of the most active
 *  participants.
 *******************************************************************/

const ColoredItem = function(props) {

  function createSpan(text) {
    return <span
      style={{
        cursor: 'default'
      }}
      onMouseEnter={(e) => props.showTooltip(e, props.item[props.item.length - 1])}
      onMouseLeave={props.hideTooltip}>{text}</span>;
  }

  if (props.y === 0 || props.x === 0) {
    return <td>{props.item}</td>;
  } else {
    const item = props.item[props.index];
    const color = props.color[props.index];
    const colors = ['green', 'yellow', 'red'];
    if (colors.indexOf(color) >= 0) {
      return <td className={'statistics-' + color}>{createSpan(item)}</td>;
    } else {
      return <td>{createSpan(item)}</td>;
    }
  }
};

// ********************************************************************************************************************

class Tooltip extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidUpdate() {

    if (!this.props.data || !this.props.data.stats || this.props.data.stats.length < 1 || this.props.data.stats === '-') {
      return;
    }

    /* Data is in format "234|5" in which the first part is minutes after
     * midnight and the second if the length of the queue.
    */

    const data = this.props.data.stats.map(function(x) {
      const parts = x.split('|');
      const hours = ~~(+parts[0] / 60);
      let minutes = +parts[0] % 60;
      if (minutes < 10) {
        minutes = '0' + minutes;
      }
      return [
        hours + ':' + minutes, + parts[1]
      ];
    });

    const svg = d3.select('#tooltip-svg');
    svg.selectAll('g').remove();

    const margin = {
      top: 10,
      right: 25,
      bottom: 20,
      left: 25
    };
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    const parseTime = d3.timeParse('%H:%M');
    const x = d3.scaleTime().rangeRound([0, width]);
    const y = d3.scaleLinear().rangeRound([height, 0]);
    const line = d3.line().x(function(d) {
      return x(parseTime(d[0]));
    }).y(function(d) {
      return y(d[1]);
    });

    x.domain(d3.extent(data, function(d) {
      return parseTime(d[0]);
    })).nice(d3.timeMinute, 30);

    let maxY = d3.max(data, function(d) {
      return d[1];
    });

    // Ceil to the nearest modulo five
    let addY = (5 - (maxY % 5)) % 5;

    // But always at least five
    maxY = Math.max(maxY + addY, 5);

    y.domain([0, maxY]);

    const yTicks = [];
    let yTickIncrement = 1;

    if (maxY > 10) {
      yTickIncrement = 5;
    } else if (maxY > 5) {
      yTickIncrement = 2;
    }

    let yTick = 0;
    while (yTick <= maxY) {
      yTicks.push(yTick);
      yTick += yTickIncrement;
    }

    const hours = (x.domain()[1].valueOf() - x.domain()[0].valueOf()) / 3600000;
    let minuteTicks = d3.timeMinute.every(30);
    let minuteGridLines = d3.timeMinute.every(10);

    if (hours >= 6) {
      minuteTicks = d3.timeHour.every(2);
      minuteGridLines = d3.timeMinute.every(60);
    } else if (hours >= 3) {
      minuteTicks = d3.timeMinute.every(60);
      minuteGridLines = d3.timeMinute.every(30);
    }

    const xAxis = d3.axisBottom().scale(x).ticks(minuteTicks).tickFormat(d3.timeFormat('%H:%M'));
    const yAxis = d3.axisLeft(y).tickValues(yTicks).tickFormat(d3.format('.0f'));
    const yAxisGrid = d3.axisLeft(y).tickValues(yTicks);
    const xAxisGrid = d3.axisTop().scale(x).ticks(minuteGridLines);

    g.append('g').attr('class', 'grid').call(xAxisGrid.tickSize(-height, 0, 0).tickFormat('')).select('.domain ').remove();
    g.append('g').attr('class', 'grid').call(yAxisGrid.tickSize(-width, 0, 0).tickFormat('')).select('.domain ').remove();
    g.append('g').attr('transform', 'translate(0,' + height + ')').call(xAxis);
    g.append('g').call(yAxis);

    g.append('path').datum(data).attr('fill', 'none').attr('stroke', '#007').attr('stroke-width', 1.5).attr('d', line);

  }

  render() {
    if (!this.props.data || !this.props.data.stats || this.props.data.stats.length < 1 || this.props.data.stats === '-') {
      return null;
    }
    return <div id="tooltip" style={{
        top: this.props.data.y,
        left: this.props.data.x
      }}>
      <div style={{
          fontSize: '13px',
          fontWeight: 'bold'
        }}><FormattedMessage id="statistics-queue-graph"/></div>
      <svg id="tooltip-svg" width="400" height="200"></svg>
    </div>;
  }
}

// ********************************************************************************************************************

const TableRow = function(props) {
  return <tr>
    {
      props.row.map(function(item, i) {
        return <ColoredItem
          redLimit={props.redLimit}
          yellowLimit={props.yellowLimit}
          key={i}
          x={i}
          y={props.y}
          item={item}
          color={props.colors[i]}
          index={props.index}
          showTooltip={props.showTooltip}
          hideTooltip={props.hideTooltip}/>;
      })
    }
  </tr>;
};

// ********************************************************************************************************************

const FrequentUsers = function(props) {
  return <div>
    <hr/>

    <h3><FormattedMessage id="statistics-most-active-title"/></h3>

    <div className="alert alert-info">
      <FormattedMessage id="statistics-most-active-info"/>
    </div>

    <p>
      <FormattedMessage id="statistics-most-active-main"/>
    </p>

    <table className="table table-condensed">
      <thead>
        <tr>
          <th><FormattedMessage id="statistics-th-active-position"/></th>
          <th><FormattedMessage id="statistics-th-active-name"/></th>
          <th><FormattedMessage id="statistics-th-active-visits"/></th>
        </tr>
      </thead>
      <tbody>
        {
          props.mostFrequent.map(function(participant, i) {
            return <tr key={i}>
              <td><FormattedMessage id="ordinal-value" values={{
                position: participant[0]
              }}/></td>
              <td>{participant[1]}</td>
              <td>{participant[2]}</td>
            </tr>;
          })
        }
      </tbody>
    </table>
  </div>;
};

// ********************************************************************************************************************

const SessionParticipants = function(props) {

  const searchParticipants = function(e) {
    e.preventDefault();

    const form = $(event.target).closest('form');
    const postData = form.serializeArray();
    const formURL = $(form).attr('action');

    $.post(formURL, postData, function(data) {
        props.setParticipants(data.participants);
    });

  };

  return <div>
    <hr/>

    <h3><FormattedMessage id="statistics-session-participants-title"/></h3>

    <div className="alert alert-info">
      <FormattedMessage id="statistics-most-active-info"/>
    </div>

    <p style={{marginBottom: '20px'}}>
      <FormattedMessage id="statistics-session-participants-main"/>
    </p>

    <div>
      <form className="form-horizontal" method="post" action={'#'}>
        <input type="hidden" name="action" value="search"/>
        <input type="hidden" name="_csrf" value={props.csrf}/>
        <input type="hidden" name="dateFormat" value={props.intl.formatMessage({id: 'date-input-format'})}/>
        <div className="form-group">
          <label htmlFor="courseName" className="col-sm-2 control-label"><FormattedMessage id="queue-group"/></label>
          <div className="col-sm-6">
            <select name="session">
              {props.sessions.map(function(session) {
                return <option key={session.id} value={session.id}>{session.name}</option>
              })}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="date" className="col-sm-2 control-label"><FormattedMessage id="statistics-session-date"/></label>
          <div className="col-sm-4">
            <input
              type="text"
              className="form-control calendar"
              name="date"
              id="date"/>
            <p className="help-block small"><FormattedMessage id="modify-date-help"/></p>
          </div>
        </div>

        <div className="form-group">
          <div className="col-sm-offset-2 col-sm-10">
            <button onClick={searchParticipants} className="btn btn-primary">
              <FormattedMessage id="search"/>
            </button>
          </div>
        </div>
      </form>
    </div>

    {props.participantsSearched && props.participants.length > 0 && <div>

      <table className="table table-condensed">
        <thead>
          <tr>
            <th><FormattedMessage id="statistics-th-active-name"/></th>
            <th><FormattedMessage id="manage-th-location"/></th>
          </tr>
        </thead>
        <tbody>
          {
            props.participants.map(function(participant, i) {
              return <tr key={i}>
                <td>{`${participant.name.first} ${participant.name.last}`}</td>
                <td>{participant.locations.join(', ').replace(/REMOTELOCATION/g, props.intl.formatMessage({id: 'queue-remote'}))}</td>
              </tr>;
            })
          }
        </tbody>
      </table>

    </div>}

    {props.participantsSearched && props.participants.length === 0 && <div>
      <p>
        <FormattedMessage id="statistics-no-search-results"/>
      </p>
    </div>}


  </div>;
};

// ********************************************************************************************************************

export class Statistics_ extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedIndex: 0,
      tooltip: null,
      participantsSearched: false,
      participants: []
    };

    this.selectionChange = this.selectionChange.bind(this);
    this.showTooltip = this.showTooltip.bind(this);
    this.hideTooltip = this.hideTooltip.bind(this);
    this.setParticipants = this.setParticipants.bind(this);

  }

  selectionChange(e) {
    this.setState({
      selectedIndex: +e.target.value.split('|')[0]
    });
  }

  setParticipants(participants) {
    this.setState({
      participantsSearched: true,
      participants: participants
    });
  }

  showTooltip(e, stats) {
    if (!this.props.view.showGraph) {
      return;
    }
    this.setState({
      tooltip: {
        x: (e.pageX + 30) + 'px',
        y: (e.pageY - 100) + 'px',
        stats: stats
      }
    });
  }

  hideTooltip() {
    this.setState({tooltip: null});
  }

  componentDidMount() {
    $('.calendar').datetimepicker({
      locale: this.props.view.UILanguage,
      format: this.props.intl.formatMessage({id: 'date-input-format'})
    });
  }

  render() {
    return <div>

      {
        this.props.view.datasetNames.length > 1 && <div>
            <select onChange={this.selectionChange}>
              {
                this.props.view.datasetNames.map(
                  (name, index) => <option key={`${name}`} value={`${index}|${name}`}>{this.props.intl.formatMessage({id: name})}</option>
                )
              }
            </select>
          </div>
      }

      <h3><FormattedMessage id={this.props.view.datasetNames[this.state.selectedIndex]}/></h3>

      <p>
        <FormattedMessage id={this.props.view.datasetNames[this.state.selectedIndex] + '-lead'}/>
      </p>

      {
        this.props.view.showGraph && <p>
            <FormattedMessage id="statistics-queue-graph-lead"/>
          </p>
      }

      <table className="statistics-table">
        <tbody>
          {
            this.props.view.stats.map(
              (row, i) => <TableRow
                redLimit={this.props.view.redLimit}
                yellowLimit={this.props.view.yellowLimit}
                index={this.state.selectedIndex}
                key={i}
                y={i}
                row={row}
                colors={this.props.view.colors[i]}
                showTooltip={this.showTooltip}
                hideTooltip={this.hideTooltip}/>
            )
          }
        </tbody>
      </table>

      {
        this.props.view.teacher && this.props.view.mostFrequent && this.props.view.mostFrequent.length > 0 && <div>
            <FrequentUsers mostFrequent={this.props.view.mostFrequent}/>
          </div>
      }

      {
        this.props.view.teacher && this.props.view.showParticipants && <div>
          <SessionParticipants
            sessions={this.props.view.sessionNames}
            csrf={this.props.view.csrf}
            intl={this.props.intl}
            setParticipants={this.setParticipants}
            participantsSearched={this.state.participantsSearched}
            participants={this.state.participants}/>
        </div>
      }

      <Tooltip data={this.state.tooltip}/>

    </div>;
  }
}

// ********************************************************************************************************************

const Statistics = injectIntl(Statistics_);
export {
  Statistics
};
