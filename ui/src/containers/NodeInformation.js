import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { createSelector } from 'reselect';
import { Table } from 'core-ui';
import memoizeOne from 'memoize-one';
import { sortBy as sortByArray } from 'lodash';
import styled from 'styled-components';

import { fetchPodsAction } from '../ducks/app/pods';

const NodeInformationContainer = styled.div`
  height: 100%;
`;

const InformationTitle = styled.h3`
  padding: 20px 30px 10px 30px;
  margin: 0;
`;

const InformationSpan = styled.span`
  padding: 10px 30px;
`;

const InformationLabel = styled.span`
  font-size: 12px;
  padding: 0 10px;
`;

const InformationValue = styled.span`
  font-size: 14px;
  padding: 0 10px;
`;

const InformationMainValue = styled(InformationValue)`
  font-weight: bold;
`;
class NodeInformation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pods: [],
      sortBy: 'name',
      sortDirection: 'ASC',
      columns: [
        {
          label: props.intl.messages.name,
          dataKey: 'name'
        },
        {
          label: props.intl.messages.status,
          dataKey: 'status'
        },
        {
          label: props.intl.messages.namespace,
          dataKey: 'namespace'
        },
        {
          label: props.intl.messages.start_time,
          dataKey: 'startTime'
        },
        {
          label: props.intl.messages.restart,
          dataKey: 'restartCount'
        }
      ]
    };
    this.onSort = this.onSort.bind(this);
  }

  componentDidMount() {
    this.props.fetchPods();
  }

  onSort({ sortBy, sortDirection }) {
    this.setState({ sortBy, sortDirection });
  }

  sortPods(pods, sortBy, sortDirection) {
    return memoizeOne((pods, sortBy, sortDirection) => {
      const sortedList = sortByArray(pods, [
        pod => {
          return typeof pod[sortBy] === 'string'
            ? pod[sortBy].toLowerCase()
            : pod[sortBy];
        }
      ]);

      if (sortDirection === 'DESC') {
        sortedList.reverse();
      }
      return sortedList;
    })(pods, sortBy, sortDirection);
  }

  render() {
    const podsSortedList = this.sortPods(
      this.props.pods,
      this.state.sortBy,
      this.state.sortDirection
    );

    return (
      <NodeInformationContainer>
        <InformationTitle>
          {this.props.intl.messages.information}
        </InformationTitle>
        <InformationSpan>
          <InformationLabel>{this.props.intl.messages.name}</InformationLabel>
          <InformationMainValue>{this.props.node.name}</InformationMainValue>
        </InformationSpan>

        <InformationTitle>Pods</InformationTitle>
        <Table
          list={podsSortedList}
          columns={this.state.columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={this.state.sortBy}
          sortDirection={this.state.sortDirection}
          onSort={this.onSort}
          onRowClick={() => {}}
        />
      </NodeInformationContainer>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  node: makeGetNodeFromUrl(state, ownProps),
  pods: makeGetPodsFromUrl(state, ownProps)
});

const mapDispatchToProps = dispatch => {
  return {
    fetchPods: () => dispatch(fetchPodsAction())
  };
};

const getNodeFromUrl = (state, props) => {
  const nodes = state.app.nodes.list || [];
  if (props && props.match && props.match.params && props.match.params.id) {
    return nodes.find(node => node.name === props.match.params.id) || {};
  } else {
    return {};
  }
};

const getPodsFromUrl = (state, props) => {
  const pods = state.app.pods.list || [];
  if (props && props.match && props.match.params && props.match.params.id) {
    return pods.filter(pod => pod.nodeName === props.match.params.id) || {};
  } else {
    return {};
  }
};

const makeGetNodeFromUrl = createSelector(
  getNodeFromUrl,
  node => node
);

const makeGetPodsFromUrl = createSelector(
  getPodsFromUrl,
  pods => pods
);

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(NodeInformation)
);
