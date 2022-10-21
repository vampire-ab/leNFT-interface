import styles from "../styles/Home.module.css";
import { Button, Table, Avatar, Tag, Skeleton } from "@web3uikit/core";
import { getReserves } from "../helpers/getReserves.js";
import { formatUnits, parseUnits } from "@ethersproject/units";
import StyledModal from "../components/StyledModal";
import { ethers } from "ethers";
import contractAddresses from "../contractAddresses.json";
import CreateReserve from "../components/CreateReserve";
import reserveContract from "../contracts/Reserve.json";
import { useAccount, useNetwork, useContract, useProvider } from "wagmi";
import erc721 from "../contracts/erc721.json";
import erc20 from "../contracts/erc20.json";
import { useState, useEffect } from "react";
import Router from "next/router";
import { ExternalLink } from "@web3uikit/icons";

export default function Reserves() {
  const SECONDS_IN_DAY = 86400;
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [tableData, setTableData] = useState([]);
  const provider = useProvider();
  const [loadingTableData, setLoadingTableData] = useState(true);
  const [visibleCreateReserveModal, setVisibleCreateReserveModal] =
    useState(false);
  const EmptyRowsForSkeletonTable = () => (
    <div style={{ width: "100%", height: "100%" }}>
      {[...Array(6)].map((el, i) => (
        <Skeleton theme="subtitle" width="30%" />
      ))}
    </div>
  );

  async function updateTableData() {
    setLoadingTableData(true);
    const reserves = await getReserves(chain.id);
    console.log("reserves", reserves);
    var newTableData = [];
    var reserve;

    for (const [key, value] of Object.entries(reserves)) {
      var assetNames = [];
      var daysSinceCreation = 0;
      var tvl = 0;
      var underlyingTokenAddress;
      var underlyingToken;
      var underlyingSymbol;
      var reserve;

      // Get asset names
      for (let i = 0; i < value.assets.length; i++) {
        console.log("value.assets[i]", value.assets[i]);
        const nft = new ethers.Contract(value.assets[i], erc721, provider);
        const name = await nft.name();
        assetNames.push(name);
      }
      // Get reserve time since creation
      daysSinceCreation = Math.floor(
        (Date.now() / 1000 - (await provider.getBlock(value.block)).timestamp) /
          SECONDS_IN_DAY
      );

      // Get reserve contract to get the TVL and then get underlying ERC20 token to get token symbol
      reserve = new ethers.Contract(key, reserveContract.abi, provider);
      tvl = await reserve.getUnderlyingBalance();
      underlyingTokenAddress = await reserve.getAsset();
      underlyingToken = new ethers.Contract(
        underlyingTokenAddress,
        erc20,
        provider
      );
      underlyingSymbol = await underlyingToken.symbol();

      newTableData.push([
        <div className="m-2 break-all">
          {assetNames.length == 0 ? (
            <span>No Assets</span>
          ) : (
            assetNames.map((assetName) => (
              <div key={assetName}>{assetName}</div>
            ))
          )}
        </div>,
        <div className="m-2">{daysSinceCreation + " days ago"}</div>,
        <div className="m-2">
          {formatUnits(tvl, 18) + " " + underlyingSymbol}
        </div>,
        <Button
          customize={{
            backgroundColor: "blue",
            fontSize: 16,
            textColor: "white",
          }}
          text="Details"
          theme="custom"
          size="large"
          id={key}
          radius="12"
          onClick={async function (event) {
            console.log(key);
            Router.push({
              pathname: "/reserve/[address]",
              query: { address: event.target.id },
            });
          }}
        />,
        <Button
          size="large"
          color="#eae5ea"
          iconLayout="icon-only"
          id={key}
          icon={<ExternalLink fontSize="30px" />}
          onClick={async function (event) {
            if (chain.id == 1) {
              window.open(
                "https://etherscan.io/address/" + event.target.id,
                "_blank"
              );
            } else if (chain.id == 5) {
              window.open(
                "https://goerli.etherscan.io/address/" + event.target.id,
                "_blank"
              );
            }
          }}
        />,
      ]);
    }

    setTableData(newTableData);
    setLoadingTableData(false);
  }

  useEffect(() => {
    if (isConnected) {
      updateTableData();
    }
  }, [isConnected]);

  return (
    <div className={styles.container}>
      <StyledModal
        hasFooter={false}
        title="Create Reserve"
        isVisible={visibleCreateReserveModal}
        width="50%"
        onCloseButtonPressed={function () {
          setVisibleCreateReserveModal(false);
        }}
      >
        <CreateReserve
          setVisibility={setVisibleCreateReserveModal}
          updateUI={updateTableData}
        />
      </StyledModal>
      <div className="flex flex-col">
        <div className="flex flex-row justify-end m-2 mb-4">
          <Button
            customize={{
              backgroundColor: "grey",
              fontSize: 20,
              textColor: "white",
            }}
            text="Create Reserve"
            theme="custom"
            size="large"
            radius="12"
            onClick={async function () {
              setVisibleCreateReserveModal(true);
            }}
          />
        </div>
        <Table
          columnsConfig="3fr 2fr 2fr 1fr 0fr"
          tableBackgroundColor="#2c2424"
          customLoadingContent={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "80%",
                width: "80%",
              }}
            >
              <EmptyRowsForSkeletonTable />
              <EmptyRowsForSkeletonTable />
            </div>
          }
          customNoDataText="No reserves found."
          data={tableData}
          header={[
            <span className="m-2" key="0">
              Assets
            </span>,
            <span className="m-2" key="1">
              Created
            </span>,
            <span className="m-2" key="2">
              TVL
            </span>,
            "",
            "",
          ]}
          isLoading={loadingTableData}
          isColumnSortable={[false, true, true]}
          onPageNumberChanged={function noRefCheck() {}}
          onRowClick={function noRefCheck() {}}
          pageSize={5}
        />
      </div>
    </div>
  );
}
