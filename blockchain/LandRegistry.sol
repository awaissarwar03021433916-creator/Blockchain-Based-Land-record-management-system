// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title  LandRegistry
 * @notice Tamper-proof land ownership ledger for the FYP land-record system.
 * @dev    Write access is restricted: only authorized registrars (the backend's
 *         signing account) may register land or transfer ownership. Without
 *         this, any address holding the ABI could rewrite ownership, which
 *         would defeat the "tamper-proof" guarantee of the system.
 */
contract LandRegistry {
    /// @notice Contract administrator. Set to the deployer in the constructor.
    address public admin;

    /// @notice Addresses permitted to register land and transfer ownership.
    mapping(address => bool) public registrars;

    struct Land {
        string plotNumber;
        string location;
        address owner;
    }

    /// @notice lands[plotNumber][location] => Land record.
    mapping(string => mapping(string => Land)) public lands;

    event RegistrarUpdated(address indexed registrar, bool authorized);
    event LandRegistered(string plot, string location, address indexed owner);
    event OwnershipTransferred(
        string plot,
        string location,
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "LandRegistry: caller is not the admin");
        _;
    }

    modifier onlyRegistrar() {
        require(
            registrars[msg.sender],
            "LandRegistry: caller is not an authorized registrar"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        registrars[msg.sender] = true; // deployer is the first registrar
        emit RegistrarUpdated(msg.sender, true);
    }

    /**
     * @notice Authorize or revoke a registrar address.
     * @dev    Use this if the backend's signing account ever changes.
     */
    function setRegistrar(address _registrar, bool _authorized)
        external
        onlyAdmin
    {
        require(_registrar != address(0), "LandRegistry: zero address");
        registrars[_registrar] = _authorized;
        emit RegistrarUpdated(_registrar, _authorized);
    }

    /**
     * @notice Register a new land record on-chain.
     * @dev    Reverts if the (plot, location) pair is already registered.
     */
    function registerLand(
        string memory _plot,
        string memory _location,
        address _owner
    ) public onlyRegistrar {
        require(_owner != address(0), "LandRegistry: invalid owner address");
        require(
            lands[_plot][_location].owner == address(0),
            "LandRegistry: land already registered"
        );

        lands[_plot][_location] = Land(_plot, _location, _owner);
        emit LandRegistered(_plot, _location, _owner);
    }

    /**
     * @notice Transfer ownership of an existing land record.
     * @dev    Reverts if the land has not been registered.
     */
    function transferOwnership(
        string memory _plot,
        string memory _location,
        address _newOwner
    ) public onlyRegistrar {
        require(
            _newOwner != address(0),
            "LandRegistry: invalid new owner address"
        );

        address previousOwner = lands[_plot][_location].owner;
        require(
            previousOwner != address(0),
            "LandRegistry: land is not registered"
        );

        lands[_plot][_location].owner = _newOwner;
        emit OwnershipTransferred(_plot, _location, previousOwner, _newOwner);
    }
}
